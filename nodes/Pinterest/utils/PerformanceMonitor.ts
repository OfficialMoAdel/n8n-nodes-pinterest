import type { Logger, PerformanceMetrics } from './Logger';

/**
 * Performance monitoring thresholds
 */
export interface PerformanceThresholds {
	slowResponseTime: number; // ms
	verySlowResponseTime: number; // ms
	lowSuccessRate: number; // percentage
	highErrorRate: number; // percentage
}

/**
 * Performance alert types
 */
export enum AlertType {
	SLOW_RESPONSE = 'slow_response',
	VERY_SLOW_RESPONSE = 'very_slow_response',
	LOW_SUCCESS_RATE = 'low_success_rate',
	HIGH_ERROR_RATE = 'high_error_rate',
	RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
	AUTHENTICATION_FAILURE = 'authentication_failure',
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
	type: AlertType;
	message: string;
	severity: 'low' | 'medium' | 'high';
	timestamp: number;
	metadata?: Record<string, any>;
}

/**
 * Request timing information
 */
export interface RequestTiming {
	requestId: string;
	operation: string;
	startTime: number;
	endTime?: number;
	responseTime?: number;
}

/**
 * Performance Monitor for Pinterest API operations
 * Tracks response times, success rates, and generates alerts for performance issues
 */
export class PerformanceMonitor {
	private logger: Logger;
	private activeRequests: Map<string, RequestTiming> = new Map();
	private alerts: PerformanceAlert[] = [];
	private readonly maxAlerts = 100;

	private readonly defaultThresholds: PerformanceThresholds = {
		slowResponseTime: 2000, // 2 seconds
		verySlowResponseTime: 5000, // 5 seconds
		lowSuccessRate: 90, // 90%
		highErrorRate: 10, // 10%
	};

	private thresholds: PerformanceThresholds;

	constructor(logger: Logger, thresholds?: Partial<PerformanceThresholds>) {
		this.logger = logger;
		this.thresholds = { ...this.defaultThresholds, ...thresholds };
	}

	/**
	 * Start monitoring a request
	 * @param requestId Unique request identifier
	 * @param operation Operation name
	 */
	startRequest(requestId: string, operation: string): void {
		const timing: RequestTiming = {
			requestId,
			operation,
			startTime: Date.now(),
		};

		this.activeRequests.set(requestId, timing);

		this.logger.debug('Performance monitoring started', {
			requestId,
			operation,
			startTime: timing.startTime,
		});
	}

	/**
	 * End monitoring a request and record performance metrics
	 * @param requestId Unique request identifier
	 * @param statusCode Response status code
	 * @param responseSize Response size in bytes (optional)
	 * @param retryCount Number of retries (optional)
	 */
	endRequest(
		requestId: string,
		statusCode: number,
		responseSize?: number,
		retryCount?: number,
	): void {
		const timing = this.activeRequests.get(requestId);
		if (!timing) {
			this.logger.warn('Performance monitoring: Request not found', { requestId });
			return;
		}

		const endTime = Date.now();
		const responseTime = endTime - timing.startTime;

		// Update timing
		timing.endTime = endTime;
		timing.responseTime = responseTime;

		// Remove from active requests
		this.activeRequests.delete(requestId);

		// Check for performance issues
		this.checkPerformanceThresholds(timing, statusCode, responseSize, retryCount);

		this.logger.debug('Performance monitoring completed', {
			requestId,
			operation: timing.operation,
			responseTime,
			statusCode,
			responseSize,
			retryCount,
		});
	}

	/**
	 * Record a failed request (when request couldn't complete)
	 * @param requestId Unique request identifier
	 * @param error Error that caused the failure
	 */
	recordFailedRequest(requestId: string, error: Error): void {
		const timing = this.activeRequests.get(requestId);
		if (!timing) {
			this.logger.warn('Performance monitoring: Failed request not found', { requestId });
			return;
		}

		const endTime = Date.now();
		const responseTime = endTime - timing.startTime;

		// Update timing
		timing.endTime = endTime;
		timing.responseTime = responseTime;

		// Remove from active requests
		this.activeRequests.delete(requestId);

		// Generate alert for failed request
		this.generateAlert(AlertType.AUTHENTICATION_FAILURE, {
			message: `Request failed: ${error.message}`,
			severity: 'high' as const,
			metadata: {
				requestId,
				operation: timing.operation,
				responseTime,
				errorName: error.name,
				errorMessage: error.message,
			},
		});

		this.logger.debug('Performance monitoring: Request failed', {
			requestId,
			operation: timing.operation,
			responseTime,
			error: error.message,
		});
	}

	/**
	 * Get current performance statistics
	 */
	getPerformanceStats(): {
		activeRequests: number;
		averageResponseTime: number;
		slowRequests: number;
		verySlowRequests: number;
		recentAlerts: PerformanceAlert[];
		operationStats: Array<{
			operation: string;
			count: number;
			averageTime: number;
			successRate: number;
		}>;
	} {
		const performanceMetrics = this.logger.getPerformanceMetrics();
		const operationalMetrics = this.logger.getOperationalMetrics();

		// Calculate operation-specific stats
		const operationMap = new Map<string, { times: number[]; successes: number; total: number }>();

		// This would need access to the performance metrics from the logger
		// For now, we'll return basic stats
		const operationStats: Array<{
			operation: string;
			count: number;
			averageTime: number;
			successRate: number;
		}> = [];

		return {
			activeRequests: this.activeRequests.size,
			averageResponseTime: operationalMetrics.averageResponseTime,
			slowRequests: 0, // Would need to calculate from metrics
			verySlowRequests: 0, // Would need to calculate from metrics
			recentAlerts: this.alerts.slice(-10),
			operationStats,
		};
	}

	/**
	 * Get all active alerts
	 */
	getAlerts(): PerformanceAlert[] {
		return [...this.alerts];
	}

	/**
	 * Clear all alerts
	 */
	clearAlerts(): void {
		this.alerts = [];
		this.logger.info('Performance alerts cleared');
	}

	/**
	 * Update performance thresholds
	 * @param newThresholds New threshold values
	 */
	updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
		this.thresholds = { ...this.thresholds, ...newThresholds };
		this.logger.info('Performance thresholds updated', { thresholds: this.thresholds });
	}

	/**
	 * Get current performance thresholds
	 */
	getThresholds(): PerformanceThresholds {
		return { ...this.thresholds };
	}

	/**
	 * Check if any active requests are taking too long
	 */
	checkLongRunningRequests(): PerformanceAlert[] {
		const now = Date.now();
		const longRunningAlerts: PerformanceAlert[] = [];

		for (const [requestId, timing] of this.activeRequests) {
			const duration = now - timing.startTime;

			if (duration > this.thresholds.verySlowResponseTime) {
				const alert: PerformanceAlert = {
					type: AlertType.VERY_SLOW_RESPONSE,
					message: `Request taking very long: ${timing.operation}`,
					severity: 'high',
					timestamp: now,
					metadata: {
						requestId,
						operation: timing.operation,
						duration,
						threshold: this.thresholds.verySlowResponseTime,
					},
				};

				longRunningAlerts.push(alert);
				this.addAlert(alert);
			} else if (duration > this.thresholds.slowResponseTime) {
				const alert: PerformanceAlert = {
					type: AlertType.SLOW_RESPONSE,
					message: `Request taking longer than expected: ${timing.operation}`,
					severity: 'medium',
					timestamp: now,
					metadata: {
						requestId,
						operation: timing.operation,
						duration,
						threshold: this.thresholds.slowResponseTime,
					},
				};

				longRunningAlerts.push(alert);
				this.addAlert(alert);
			}
		}

		return longRunningAlerts;
	}

	/**
	 * Generate performance report
	 */
	generateReport(): {
		summary: {
			totalRequests: number;
			successRate: number;
			averageResponseTime: number;
			alertCount: number;
		};
		thresholds: PerformanceThresholds;
		recentAlerts: PerformanceAlert[];
		recommendations: string[];
	} {
		const operationalMetrics = this.logger.getOperationalMetrics();
		const performanceMetrics = this.logger.getPerformanceMetrics();

		const successRate =
			operationalMetrics.totalRequests > 0
				? (operationalMetrics.successfulRequests / operationalMetrics.totalRequests) * 100
				: 0;

		const recommendations: string[] = [];

		// Generate recommendations based on metrics
		if (successRate < this.thresholds.lowSuccessRate) {
			recommendations.push(
				`Success rate (${successRate.toFixed(1)}%) is below threshold (${this.thresholds.lowSuccessRate}%). Check for authentication or API issues.`,
			);
		}

		if (operationalMetrics.averageResponseTime > this.thresholds.slowResponseTime) {
			recommendations.push(
				`Average response time (${operationalMetrics.averageResponseTime.toFixed(0)}ms) is above threshold (${this.thresholds.slowResponseTime}ms). Consider optimizing requests or checking network connectivity.`,
			);
		}

		if (operationalMetrics.rateLimitHits > 0) {
			recommendations.push(
				`Rate limit hits detected (${operationalMetrics.rateLimitHits}). Consider implementing request batching or increasing delays between requests.`,
			);
		}

		if (operationalMetrics.authenticationErrors > 0) {
			recommendations.push(
				`Authentication errors detected (${operationalMetrics.authenticationErrors}). Check credential configuration and token refresh settings.`,
			);
		}

		if (this.activeRequests.size > 10) {
			recommendations.push(
				`High number of active requests (${this.activeRequests.size}). Monitor for potential bottlenecks or hanging requests.`,
			);
		}

		return {
			summary: {
				totalRequests: operationalMetrics.totalRequests,
				successRate: Math.round(successRate * 100) / 100,
				averageResponseTime: Math.round(operationalMetrics.averageResponseTime * 100) / 100,
				alertCount: this.alerts.length,
			},
			thresholds: this.thresholds,
			recentAlerts: this.alerts.slice(-5),
			recommendations,
		};
	}

	/**
	 * Check performance thresholds and generate alerts
	 * @param timing Request timing information
	 * @param statusCode Response status code
	 * @param responseSize Response size in bytes
	 * @param retryCount Number of retries
	 */
	private checkPerformanceThresholds(
		timing: RequestTiming,
		statusCode: number,
		responseSize?: number,
		retryCount?: number,
	): void {
		const responseTime = timing.responseTime!;

		// Check response time thresholds
		if (responseTime > this.thresholds.verySlowResponseTime) {
			this.generateAlert(AlertType.VERY_SLOW_RESPONSE, {
				message: `Very slow response: ${timing.operation} took ${responseTime}ms`,
				severity: 'high',
				metadata: {
					operation: timing.operation,
					responseTime,
					threshold: this.thresholds.verySlowResponseTime,
					statusCode,
					retryCount,
				},
			});
		} else if (responseTime > this.thresholds.slowResponseTime) {
			this.generateAlert(AlertType.SLOW_RESPONSE, {
				message: `Slow response: ${timing.operation} took ${responseTime}ms`,
				severity: 'medium',
				metadata: {
					operation: timing.operation,
					responseTime,
					threshold: this.thresholds.slowResponseTime,
					statusCode,
					retryCount,
				},
			});
		}

		// Check for rate limiting
		if (statusCode === 429) {
			this.generateAlert(AlertType.RATE_LIMIT_EXCEEDED, {
				message: `Rate limit exceeded for ${timing.operation}`,
				severity: 'medium',
				metadata: {
					operation: timing.operation,
					responseTime,
					statusCode,
				},
			});
		}

		// Check for authentication failures
		if (statusCode === 401) {
			this.generateAlert(AlertType.AUTHENTICATION_FAILURE, {
				message: `Authentication failure for ${timing.operation}`,
				severity: 'high',
				metadata: {
					operation: timing.operation,
					responseTime,
					statusCode,
				},
			});
		}
	}

	/**
	 * Generate and store a performance alert
	 * @param type Alert type
	 * @param alertData Alert data
	 */
	private generateAlert(
		type: AlertType,
		alertData: {
			message: string;
			severity: 'low' | 'medium' | 'high';
			metadata?: Record<string, any>;
		},
	): void {
		const alert: PerformanceAlert = {
			type,
			message: alertData.message,
			severity: alertData.severity,
			timestamp: Date.now(),
			metadata: alertData.metadata,
		};

		this.addAlert(alert);

		// Log the alert
		const logLevel =
			alertData.severity === 'high' ? 'error' : alertData.severity === 'medium' ? 'warn' : 'info';
		if (logLevel === 'error') {
			this.logger.error(`Performance Alert: ${alert.message}`, undefined, alert.metadata);
		} else if (logLevel === 'warn') {
			this.logger.warn(`Performance Alert: ${alert.message}`, alert.metadata);
		} else {
			this.logger.info(`Performance Alert: ${alert.message}`, alert.metadata);
		}
	}

	/**
	 * Add alert to the alerts array with size management
	 * @param alert Alert to add
	 */
	private addAlert(alert: PerformanceAlert): void {
		this.alerts.push(alert);

		// Maintain alerts history limit
		if (this.alerts.length > this.maxAlerts) {
			this.alerts = this.alerts.slice(-this.maxAlerts);
		}
	}
}
