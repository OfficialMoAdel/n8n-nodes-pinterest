import type { INode } from 'n8n-workflow';

/**
 * Log levels for Pinterest node operations
 */
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

/**
 * Log entry structure for structured logging
 */
export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	operation?: string;
	endpoint?: string;
	method?: string;
	statusCode?: number;
	responseTime?: number;
	requestId?: string;
	userId?: string;
	error?: {
		name: string;
		message: string;
		stack?: string;
		code?: string;
	};
	metadata?: Record<string, any>;
}

/**
 * Performance metrics for API operations
 */
export interface PerformanceMetrics {
	operation: string;
	endpoint: string;
	method: string;
	responseTime: number;
	statusCode: number;
	success: boolean;
	timestamp: number;
	requestSize?: number;
	responseSize?: number;
	retryCount?: number;
}

/**
 * Operational metrics for monitoring
 */
export interface OperationalMetrics {
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	averageResponseTime: number;
	rateLimitHits: number;
	authenticationErrors: number;
	serverErrors: number;
	networkErrors: number;
	lastResetTime: number;
}

/**
 * Comprehensive Logger for Pinterest node operations
 * Provides structured logging, performance monitoring, and operational metrics
 */
export class Logger {
	private node: INode;
	private performanceMetrics: PerformanceMetrics[] = [];
	private operationalMetrics: OperationalMetrics = {
		totalRequests: 0,
		successfulRequests: 0,
		failedRequests: 0,
		averageResponseTime: 0,
		rateLimitHits: 0,
		authenticationErrors: 0,
		serverErrors: 0,
		networkErrors: 0,
		lastResetTime: Date.now(),
	};
	private readonly maxMetricsHistory = 1000; // Keep last 1000 performance entries
	private readonly metricsResetInterval = 24 * 60 * 60 * 1000; // 24 hours

	constructor(node: INode) {
		this.node = node;
	}

	/**
	 * Log debug information (only in debug mode)
	 * @param message Debug message
	 * @param metadata Additional metadata
	 */
	debug(message: string, metadata?: Record<string, any>): void {
		// Only log debug messages if n8n is in debug mode
		if (process.env.N8N_LOG_LEVEL === 'debug') {
			this.log(LogLevel.DEBUG, message, metadata);
		}
	}

	/**
	 * Log informational messages
	 * @param message Info message
	 * @param metadata Additional metadata
	 */
	info(message: string, metadata?: Record<string, any>): void {
		this.log(LogLevel.INFO, message, metadata);
	}

	/**
	 * Log warning messages
	 * @param message Warning message
	 * @param metadata Additional metadata
	 */
	warn(message: string, metadata?: Record<string, any>): void {
		this.log(LogLevel.WARN, message, metadata);
	}

	/**
	 * Log error messages
	 * @param message Error message
	 * @param error Error object
	 * @param metadata Additional metadata
	 */
	error(message: string, error?: Error, metadata?: Record<string, any>): void {
		const errorMetadata = error
			? {
					error: {
						name: error.name,
						message: error.message,
						stack: process.env.N8N_LOG_LEVEL === 'debug' ? error.stack : undefined,
						code: (error as any).code,
					},
					...metadata,
				}
			: metadata;

		this.log(LogLevel.ERROR, message, errorMetadata);

		// Update operational metrics for errors
		this.operationalMetrics.failedRequests++;

		if (error) {
			if ((error as any).response?.status === 401) {
				this.operationalMetrics.authenticationErrors++;
			} else if ((error as any).response?.status === 429) {
				this.operationalMetrics.rateLimitHits++;
			} else if ((error as any).response?.status >= 500) {
				this.operationalMetrics.serverErrors++;
			} else if ((error as any).code === 'ECONNRESET' || (error as any).code === 'ETIMEDOUT') {
				this.operationalMetrics.networkErrors++;
			}
		}
	}

	/**
	 * Log API request start
	 * @param operation Operation name
	 * @param endpoint API endpoint
	 * @param method HTTP method
	 * @param requestId Unique request identifier
	 */
	logApiRequestStart(operation: string, endpoint: string, method: string, requestId: string): void {
		this.debug('API request started', {
			operation,
			endpoint: this.sanitizeEndpoint(endpoint),
			method,
			requestId,
		});
	}

	/**
	 * Log API request completion with performance metrics
	 * @param operation Operation name
	 * @param endpoint API endpoint
	 * @param method HTTP method
	 * @param statusCode Response status code
	 * @param responseTime Response time in milliseconds
	 * @param requestId Unique request identifier
	 * @param requestSize Request size in bytes (optional)
	 * @param responseSize Response size in bytes (optional)
	 * @param retryCount Number of retries (optional)
	 */
	logApiRequestComplete(
		operation: string,
		endpoint: string,
		method: string,
		statusCode: number,
		responseTime: number,
		requestId: string,
		requestSize?: number,
		responseSize?: number,
		retryCount?: number,
	): void {
		const success = statusCode >= 200 && statusCode < 300;
		const sanitizedEndpoint = this.sanitizeEndpoint(endpoint);

		// Log the completion
		const logLevel = success ? LogLevel.INFO : LogLevel.WARN;
		const message = `API request ${success ? 'completed' : 'failed'}`;

		this.log(logLevel, message, {
			operation,
			endpoint: sanitizedEndpoint,
			method,
			statusCode,
			responseTime,
			requestId,
			requestSize,
			responseSize,
			retryCount,
		});

		// Record performance metrics
		const performanceEntry: PerformanceMetrics = {
			operation,
			endpoint: sanitizedEndpoint,
			method,
			responseTime,
			statusCode,
			success,
			timestamp: Date.now(),
			requestSize,
			responseSize,
			retryCount,
		};

		this.recordPerformanceMetrics(performanceEntry);
		this.updateOperationalMetrics(performanceEntry);
	}

	/**
	 * Log rate limiting events
	 * @param action Rate limiting action (warning, queued, delayed)
	 * @param currentUsage Current usage ratio
	 * @param resetTime Time until reset
	 * @param queueLength Current queue length
	 */
	logRateLimit(
		action: 'warning' | 'queued' | 'delayed' | 'reset',
		currentUsage?: number,
		resetTime?: number,
		queueLength?: number,
	): void {
		const message = `Rate limit ${action}`;
		const metadata: Record<string, any> = {};

		if (currentUsage !== undefined) {
			metadata.usageRatio = Math.round(currentUsage * 100) / 100;
		}
		if (resetTime !== undefined) {
			metadata.resetTimeMs = resetTime;
		}
		if (queueLength !== undefined) {
			metadata.queueLength = queueLength;
		}

		if (action === 'warning' || action === 'queued') {
			this.warn(message, metadata);
		} else {
			this.info(message, metadata);
		}

		if (action === 'queued') {
			this.operationalMetrics.rateLimitHits++;
		}
	}

	/**
	 * Log authentication events
	 * @param event Authentication event type
	 * @param success Whether the event was successful
	 * @param metadata Additional metadata
	 */
	logAuthentication(
		event: 'token_refresh' | 'credential_test' | 'auth_failure',
		success: boolean,
		metadata?: Record<string, any>,
	): void {
		const message = `Authentication ${event} ${success ? 'succeeded' : 'failed'}`;
		const logLevel = success ? LogLevel.INFO : LogLevel.ERROR;

		this.log(logLevel, message, {
			authEvent: event,
			success,
			...metadata,
		});

		if (!success) {
			this.operationalMetrics.authenticationErrors++;
		}
	}

	/**
	 * Get current performance metrics summary
	 */
	getPerformanceMetrics(): {
		totalRequests: number;
		averageResponseTime: number;
		successRate: number;
		slowestOperations: Array<{ operation: string; averageTime: number }>;
		recentErrors: Array<{ operation: string; statusCode: number; timestamp: number }>;
	} {
		if (this.performanceMetrics.length === 0) {
			return {
				totalRequests: 0,
				averageResponseTime: 0,
				successRate: 0,
				slowestOperations: [],
				recentErrors: [],
			};
		}

		const totalRequests = this.performanceMetrics.length;
		const successfulRequests = this.performanceMetrics.filter((m) => m.success).length;
		const averageResponseTime =
			this.performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;

		// Calculate slowest operations
		const operationTimes: Record<string, number[]> = {};
		this.performanceMetrics.forEach((m) => {
			if (!operationTimes[m.operation]) {
				operationTimes[m.operation] = [];
			}
			operationTimes[m.operation].push(m.responseTime);
		});

		const slowestOperations = Object.entries(operationTimes)
			.map(([operation, times]) => ({
				operation,
				averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
			}))
			.sort((a, b) => b.averageTime - a.averageTime)
			.slice(0, 5);

		// Get recent errors (last 10)
		const recentErrors = this.performanceMetrics
			.filter((m) => !m.success)
			.slice(-10)
			.map((m) => ({
				operation: m.operation,
				statusCode: m.statusCode,
				timestamp: m.timestamp,
			}));

		return {
			totalRequests,
			averageResponseTime: Math.round(averageResponseTime * 100) / 100,
			successRate: Math.round((successfulRequests / totalRequests) * 10000) / 100,
			slowestOperations,
			recentErrors,
		};
	}

	/**
	 * Get current operational metrics
	 */
	getOperationalMetrics(): OperationalMetrics {
		return { ...this.operationalMetrics };
	}

	/**
	 * Reset metrics (useful for testing or periodic resets)
	 */
	resetMetrics(): void {
		this.performanceMetrics = [];
		this.operationalMetrics = {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			averageResponseTime: 0,
			rateLimitHits: 0,
			authenticationErrors: 0,
			serverErrors: 0,
			networkErrors: 0,
			lastResetTime: Date.now(),
		};
	}

	/**
	 * Core logging method
	 * @param level Log level
	 * @param message Log message
	 * @param metadata Additional metadata
	 */
	private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...metadata,
		};

		// Use n8n's logger if available, otherwise console
		const logMessage = this.formatLogEntry(entry);

		switch (level) {
			case LogLevel.DEBUG:
				console.debug(`[Pinterest Node] ${logMessage}`);
				break;
			case LogLevel.INFO:
				console.info(`[Pinterest Node] ${logMessage}`);
				break;
			case LogLevel.WARN:
				console.warn(`[Pinterest Node] ${logMessage}`);
				break;
			case LogLevel.ERROR:
				console.error(`[Pinterest Node] ${logMessage}`);
				break;
		}
	}

	/**
	 * Format log entry for output
	 * @param entry Log entry to format
	 */
	private formatLogEntry(entry: LogEntry): string {
		const { timestamp, level, message, ...metadata } = entry;
		const levelName = LogLevel[level];

		let formatted = `[${timestamp}] ${levelName}: ${message}`;

		// Add important metadata to the main message
		if (metadata.operation) {
			formatted += ` | Operation: ${metadata.operation}`;
		}
		if (metadata.endpoint) {
			formatted += ` | Endpoint: ${metadata.endpoint}`;
		}
		if (metadata.statusCode) {
			formatted += ` | Status: ${metadata.statusCode}`;
		}
		if (metadata.responseTime) {
			formatted += ` | Time: ${metadata.responseTime}ms`;
		}

		// Add additional metadata as JSON if in debug mode
		if (process.env.N8N_LOG_LEVEL === 'debug' && Object.keys(metadata).length > 0) {
			const filteredMetadata = this.sanitizeMetadata(metadata);
			formatted += ` | Metadata: ${JSON.stringify(filteredMetadata)}`;
		}

		return formatted;
	}

	/**
	 * Record performance metrics with history management
	 * @param metrics Performance metrics to record
	 */
	private recordPerformanceMetrics(metrics: PerformanceMetrics): void {
		this.performanceMetrics.push(metrics);

		// Maintain history limit
		if (this.performanceMetrics.length > this.maxMetricsHistory) {
			this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsHistory);
		}

		// Reset metrics if interval has passed
		const now = Date.now();
		if (now - this.operationalMetrics.lastResetTime > this.metricsResetInterval) {
			this.resetMetrics();
		}
	}

	/**
	 * Update operational metrics
	 * @param metrics Performance metrics to update from
	 */
	private updateOperationalMetrics(metrics: PerformanceMetrics): void {
		this.operationalMetrics.totalRequests++;

		if (metrics.success) {
			this.operationalMetrics.successfulRequests++;
		}

		// Update average response time (rolling average)
		const totalTime =
			this.operationalMetrics.averageResponseTime * (this.operationalMetrics.totalRequests - 1);
		this.operationalMetrics.averageResponseTime =
			(totalTime + metrics.responseTime) / this.operationalMetrics.totalRequests;
	}

	/**
	 * Sanitize endpoint to remove sensitive information
	 * @param endpoint API endpoint to sanitize
	 */
	private sanitizeEndpoint(endpoint: string): string {
		// Remove query parameters that might contain sensitive data
		const url = new URL(endpoint, 'https://api.pinterest.com');

		// Keep only safe query parameters
		const safeParams = ['page_size', 'bookmark', 'metric_types', 'start_date', 'end_date'];
		const sanitizedParams = new URLSearchParams();

		safeParams.forEach((param) => {
			const value = url.searchParams.get(param);
			if (value) {
				sanitizedParams.set(param, value);
			}
		});

		const sanitizedUrl =
			url.pathname + (sanitizedParams.toString() ? `?${sanitizedParams.toString()}` : '');
		return sanitizedUrl;
	}

	/**
	 * Sanitize metadata to remove sensitive information
	 * @param metadata Metadata to sanitize
	 */
	private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
		const sanitized = { ...metadata };

		// Remove sensitive fields
		const sensitiveFields = [
			'authorization',
			'token',
			'access_token',
			'refresh_token',
			'client_secret',
			'password',
			'key',
			'secret',
		];

		const sanitizeObject = (obj: any): any => {
			if (typeof obj !== 'object' || obj === null) {
				return obj;
			}

			if (Array.isArray(obj)) {
				return obj.map(sanitizeObject);
			}

			const result: any = {};
			for (const [key, value] of Object.entries(obj)) {
				const lowerKey = key.toLowerCase();
				if (sensitiveFields.some((field) => lowerKey.includes(field))) {
					result[key] = '[REDACTED]';
				} else {
					result[key] = sanitizeObject(value);
				}
			}
			return result;
		};

		return sanitizeObject(sanitized);
	}
}
