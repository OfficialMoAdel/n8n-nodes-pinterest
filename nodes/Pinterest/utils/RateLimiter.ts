import type { RateLimitInfo } from './types';
import type { Logger } from './Logger';

/**
 * Rate Limiter for Pinterest API compliance
 * Implements intelligent queuing and rate limit management for Pinterest API (1000 requests/hour)
 */
export class RateLimiter {
	private requestCount = 0;
	private resetTime = 0;
	private readonly maxRequests = 1000; // Pinterest limit: 1000/hour
	private currentLimit = 1000; // Current limit (may be updated from headers)
	private readonly windowMs = 60 * 60 * 1000; // 1 hour
	private readonly warningThreshold = 0.9; // 90% of limit
	private readonly criticalThreshold = 0.95; // 95% of limit
	private requestQueue: Array<() => void> = [];
	private isProcessingQueue = false;
	private lastRequestTime = 0;
	private readonly minRequestInterval = 100; // Minimum 100ms between requests
	private logger?: Logger;

	/**
	 * Set logger for rate limiting events
	 * @param logger Logger instance
	 */
	setLogger(logger: Logger): void {
		this.logger = logger;
	}

	/**
	 * Check if request can be made within rate limits
	 * Implements intelligent queuing when approaching limits
	 */
	async checkLimit(): Promise<void> {
		const now = Date.now();

		// Reset counter if window has passed
		if (now > this.resetTime) {
			const wasReset = this.requestCount > 0;
			this.requestCount = 0;
			this.resetTime = now + this.windowMs;

			if (wasReset && this.logger) {
				this.logger.logRateLimit('reset', 0, this.windowMs, 0);
			}
		}

		// Enforce minimum interval between requests to prevent bursting
		const timeSinceLastRequest = now - this.lastRequestTime;
		if (timeSinceLastRequest < this.minRequestInterval) {
			const delay = this.minRequestInterval - timeSinceLastRequest;
			if (this.logger) {
				this.logger.logRateLimit('delayed', undefined, delay, this.requestQueue.length);
			}
			await this.sleep(delay);
		}

		// Check if we're approaching rate limits
		const usageRatio = this.requestCount / this.maxRequests;

		if (usageRatio >= this.criticalThreshold) {
			// Critical threshold: queue the request
			if (this.logger) {
				this.logger.logRateLimit(
					'queued',
					usageRatio,
					this.getTimeUntilReset(),
					this.requestQueue.length,
				);
			}
			await this.queueRequest();
		} else if (usageRatio >= this.warningThreshold) {
			// Warning threshold: add progressive delay
			const delay = this.calculateProgressiveDelay(usageRatio);
			if (delay > 0) {
				if (this.logger) {
					this.logger.logRateLimit('warning', usageRatio, delay, this.requestQueue.length);
				}
				await this.sleep(delay);
			}
		}

		this.requestCount++;
		this.lastRequestTime = Date.now();
	}

	/**
	 * Update rate limit info from API response headers
	 * @param headers Response headers from Pinterest API
	 */
	updateFromHeaders(headers: any): void {
		if (!headers || typeof headers !== 'object') {
			return;
		}

		// Pinterest API rate limit headers
		const remaining = this.parseHeaderValue(headers['x-ratelimit-remaining']);
		const reset = this.parseHeaderValue(headers['x-ratelimit-reset']);
		const limit = this.parseHeaderValue(headers['x-ratelimit-limit']);

		// Update request count based on remaining requests
		if (remaining !== null) {
			const actualLimit = limit !== null ? limit : this.maxRequests;
			this.currentLimit = actualLimit;
			this.requestCount = Math.max(0, actualLimit - remaining);
		}

		// Update reset time from header (Unix timestamp)
		if (reset !== null && reset > 0) {
			this.resetTime = reset * 1000; // Convert to milliseconds
		}

		// If we have accurate data from headers, process any queued requests
		if (remaining !== null && remaining > 0 && this.requestQueue.length > 0) {
			this.processQueue();
		}
	}

	/**
	 * Get current rate limit status
	 */
	getRateLimitInfo(): RateLimitInfo {
		const now = Date.now();
		const remaining = Math.max(0, this.currentLimit - this.requestCount);
		const resetTimeSeconds = Math.ceil(this.resetTime / 1000);

		// If window has passed and we have a valid reset time, reset the counters
		if (this.resetTime > 0 && now > this.resetTime) {
			return {
				limit: this.currentLimit,
				remaining: this.currentLimit,
				reset: Math.ceil((now + this.windowMs) / 1000),
			};
		}

		return {
			limit: this.currentLimit,
			remaining,
			reset: resetTimeSeconds,
		};
	}

	/**
	 * Check if we're approaching rate limits
	 */
	isApproachingLimit(): boolean {
		const usageRatio = this.requestCount / this.maxRequests;
		return usageRatio >= this.warningThreshold;
	}

	/**
	 * Check if rate limit is exceeded
	 */
	isLimitExceeded(): boolean {
		const now = Date.now();

		// If window has passed, we're not exceeded
		if (now > this.resetTime) {
			return false;
		}

		return this.requestCount >= this.maxRequests;
	}

	/**
	 * Get time until rate limit reset
	 */
	getTimeUntilReset(): number {
		const now = Date.now();
		return Math.max(0, this.resetTime - now);
	}

	/**
	 * Queue a request when rate limit is exceeded
	 */
	private async queueRequest(): Promise<void> {
		return new Promise<void>((resolve) => {
			this.requestQueue.push(resolve);
			this.processQueue();
		});
	}

	/**
	 * Process queued requests when rate limit allows
	 */
	private processQueue(): void {
		if (this.isProcessingQueue || this.requestQueue.length === 0) {
			return;
		}

		this.isProcessingQueue = true;

		const processNext = () => {
			const now = Date.now();

			// Reset counter if window has passed
			if (now > this.resetTime) {
				this.requestCount = 0;
				this.resetTime = now + this.windowMs;
			}

			// Check if we can process requests
			if (this.requestCount < this.maxRequests && this.requestQueue.length > 0) {
				const resolve = this.requestQueue.shift();
				if (resolve) {
					resolve();
				}

				// Continue processing if there are more requests and we're under limit
				if (
					this.requestQueue.length > 0 &&
					this.requestCount < this.maxRequests * this.criticalThreshold
				) {
					setTimeout(processNext, this.minRequestInterval);
				} else {
					this.isProcessingQueue = false;
				}
			} else {
				// Wait until reset time and try again
				const waitTime = Math.min(this.getTimeUntilReset(), 60000); // Max 1 minute wait
				if (waitTime > 0) {
					setTimeout(processNext, waitTime);
				} else {
					this.isProcessingQueue = false;
				}
			}
		};

		processNext();
	}

	/**
	 * Calculate progressive delay based on usage ratio
	 */
	private calculateProgressiveDelay(usageRatio: number): number {
		// Progressive delay: 0ms at 90%, up to 5000ms at 95%
		const delayRange = 5000; // 5 seconds max delay
		const thresholdRange = this.criticalThreshold - this.warningThreshold;
		const excessRatio = (usageRatio - this.warningThreshold) / thresholdRange;

		// Exponential curve for more aggressive delay as we approach critical threshold
		return Math.floor(delayRange * Math.pow(excessRatio, 2));
	}

	/**
	 * Parse header value to number, handling various formats
	 */
	private parseHeaderValue(value: any): number | null {
		if (value === undefined || value === null || value === '') {
			return null;
		}

		const parsed = parseInt(String(value), 10);
		return isNaN(parsed) ? null : parsed;
	}

	/**
	 * Sleep for specified milliseconds
	 * @param ms Milliseconds to sleep
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Reset rate limiter state (useful for testing)
	 */
	reset(): void {
		this.requestCount = 0;
		this.resetTime = 0;
		this.currentLimit = this.maxRequests;
		this.requestQueue = [];
		this.isProcessingQueue = false;
		this.lastRequestTime = 0;
	}

	/**
	 * Get queue length (useful for monitoring)
	 */
	getQueueLength(): number {
		return this.requestQueue.length;
	}
}
