import { type INode, type ICredentialDataDecryptedObject } from 'n8n-workflow';
import { createHash } from 'crypto';
import { SecurityValidator } from './SecurityValidator';
import { CredentialSecurityValidator } from './CredentialSecurityValidator';

/**
 * Audit Logger for Pinterest Node Security Events
 * Logs security-relevant operations while protecting sensitive data
 */
export class AuditLogger {
	private static readonly SENSITIVE_OPERATIONS = [
		'pin:create',
		'pin:update',
		'pin:delete',
		'board:create',
		'board:update',
		'board:delete',
		'user:getAnalytics',
		'credential:validate',
		'credential:refresh',
		'auth:failure',
		'rate_limit:exceeded',
		'security:violation',
	];

	private static readonly LOG_LEVELS = {
		INFO: 'INFO',
		WARN: 'WARN',
		ERROR: 'ERROR',
		SECURITY: 'SECURITY',
	} as const;

	constructor(
		private node: INode,
		private workflowId?: string,
		private executionId?: string,
	) {}

	/**
	 * Log authentication events
	 */
	logAuthenticationEvent(
		event: 'success' | 'failure' | 'token_refresh' | 'credential_test',
		credentials: ICredentialDataDecryptedObject,
		details?: Record<string, any>,
	): void {
		const credentialHash = CredentialSecurityValidator.generateCredentialHash(credentials);
		const sessionId = this.generateSessionId();

		const logEntry = {
			timestamp: new Date().toISOString(),
			level: event === 'failure' ? AuditLogger.LOG_LEVELS.SECURITY : AuditLogger.LOG_LEVELS.INFO,
			event: `auth:${event}`,
			node_id: this.node.id,
			node_name: this.node.name,
			node_type: this.node.type,
			workflow_id: this.workflowId,
			execution_id: this.executionId,
			session_id: sessionId,
			credential_hash: credentialHash,
			user_agent: this.sanitizeUserAgent(details?.userAgent),
			ip_address: this.hashIpAddress(details?.ipAddress),
			details: this.sanitizeLogDetails(details),
		};

		this.writeAuditLog(logEntry);

		// Log security violations separately
		if (event === 'failure') {
			this.logSecurityViolation('authentication_failure', {
				credential_hash: credentialHash,
				failure_reason: details?.error || 'Unknown authentication failure',
				attempt_count: details?.attemptCount || 1,
			});
		}
	}

	/**
	 * Log Pinterest API operations
	 */
	logApiOperation(
		operation: string,
		resource: string,
		credentials: ICredentialDataDecryptedObject,
		success: boolean,
		details?: Record<string, any>,
	): void {
		const operationKey = `${resource}:${operation}`;
		const isSensitive = AuditLogger.SENSITIVE_OPERATIONS.includes(operationKey);

		if (!isSensitive && success) {
			// Skip logging non-sensitive successful operations to reduce noise
			return;
		}

		const credentialHash = CredentialSecurityValidator.generateCredentialHash(credentials);
		const sessionId = this.generateSessionId();

		const logEntry = {
			timestamp: new Date().toISOString(),
			level: success ? AuditLogger.LOG_LEVELS.INFO : AuditLogger.LOG_LEVELS.WARN,
			event: `api:${operationKey}`,
			node_id: this.node.id,
			node_name: this.node.name,
			node_type: this.node.type,
			workflow_id: this.workflowId,
			execution_id: this.executionId,
			session_id: sessionId,
			credential_hash: credentialHash,
			operation: operation,
			resource: resource,
			success: success,
			sensitive: isSensitive,
			response_time_ms: details?.responseTime,
			status_code: details?.statusCode,
			rate_limit_remaining: details?.rateLimitRemaining,
			error_type: details?.errorType,
			resource_id: this.hashResourceId(details?.resourceId),
			details: this.sanitizeLogDetails(details),
		};

		this.writeAuditLog(logEntry);

		// Log failures as security events
		if (!success) {
			this.logSecurityViolation('api_operation_failure', {
				operation: operationKey,
				error_type: details?.errorType || 'unknown',
				status_code: details?.statusCode,
				credential_hash: credentialHash,
			});
		}
	}

	/**
	 * Log rate limiting events
	 */
	logRateLimitEvent(
		event: 'approaching' | 'exceeded' | 'reset',
		credentials: ICredentialDataDecryptedObject,
		rateLimitInfo: {
			limit?: number;
			remaining?: number;
			reset?: number;
		},
	): void {
		const credentialHash = CredentialSecurityValidator.generateCredentialHash(credentials);

		const logEntry = {
			timestamp: new Date().toISOString(),
			level: event === 'exceeded' ? AuditLogger.LOG_LEVELS.WARN : AuditLogger.LOG_LEVELS.INFO,
			event: `rate_limit:${event}`,
			node_id: this.node.id,
			node_name: this.node.name,
			workflow_id: this.workflowId,
			execution_id: this.executionId,
			credential_hash: credentialHash,
			rate_limit: rateLimitInfo.limit,
			rate_remaining: rateLimitInfo.remaining,
			rate_reset: rateLimitInfo.reset,
			reset_time: rateLimitInfo.reset
				? new Date(rateLimitInfo.reset * 1000).toISOString()
				: undefined,
		};

		this.writeAuditLog(logEntry);

		if (event === 'exceeded') {
			this.logSecurityViolation('rate_limit_exceeded', {
				credential_hash: credentialHash,
				limit: rateLimitInfo.limit,
				reset_time: rateLimitInfo.reset,
			});
		}
	}

	/**
	 * Log security violations
	 */
	logSecurityViolation(violationType: string, details: Record<string, any>): void {
		const sessionId = this.generateSessionId();

		const logEntry = {
			timestamp: new Date().toISOString(),
			level: AuditLogger.LOG_LEVELS.SECURITY,
			event: `security:${violationType}`,
			node_id: this.node.id,
			node_name: this.node.name,
			node_type: this.node.type,
			workflow_id: this.workflowId,
			execution_id: this.executionId,
			session_id: sessionId,
			violation_type: violationType,
			severity: this.getViolationSeverity(violationType),
			details: this.sanitizeLogDetails(details),
		};

		this.writeAuditLog(logEntry);
	}

	/**
	 * Log input validation failures
	 */
	logValidationFailure(
		field: string,
		value: any,
		reason: string,
		credentials?: ICredentialDataDecryptedObject,
	): void {
		const credentialHash = credentials
			? CredentialSecurityValidator.generateCredentialHash(credentials)
			: undefined;

		const logEntry = {
			timestamp: new Date().toISOString(),
			level: AuditLogger.LOG_LEVELS.WARN,
			event: 'validation:failure',
			node_id: this.node.id,
			node_name: this.node.name,
			workflow_id: this.workflowId,
			execution_id: this.executionId,
			credential_hash: credentialHash,
			field: field,
			value_hash: this.hashSensitiveValue(value),
			reason: reason,
			value_type: typeof value,
			value_length: typeof value === 'string' ? value.length : undefined,
		};

		this.writeAuditLog(logEntry);
	}

	/**
	 * Log credential security events
	 */
	logCredentialSecurityEvent(
		event: 'validation' | 'weak_secret' | 'test_credentials' | 'scope_violation',
		credentials: ICredentialDataDecryptedObject,
		details?: Record<string, any>,
	): void {
		const credentialHash = CredentialSecurityValidator.generateCredentialHash(credentials);

		const logEntry = {
			timestamp: new Date().toISOString(),
			level: AuditLogger.LOG_LEVELS.SECURITY,
			event: `credential:${event}`,
			node_id: this.node.id,
			node_name: this.node.name,
			workflow_id: this.workflowId,
			execution_id: this.executionId,
			credential_hash: credentialHash,
			scopes: this.sanitizeScopes(credentials.scope as string),
			continuous_refresh: credentials.continuousRefresh,
			details: this.sanitizeLogDetails(details),
		};

		this.writeAuditLog(logEntry);
	}

	/**
	 * Write audit log entry
	 */
	private writeAuditLog(logEntry: Record<string, any>): void {
		// In a real implementation, this would write to:
		// - Structured logging system (e.g., Winston, Bunyan)
		// - Security Information and Event Management (SIEM) system
		// - Audit database
		// - File-based audit log with rotation

		// For now, we'll use console logging with structured format
		const logMessage = JSON.stringify(logEntry, null, 0);

		switch (logEntry.level) {
			case AuditLogger.LOG_LEVELS.SECURITY:
			case AuditLogger.LOG_LEVELS.ERROR:
				console.error(`[AUDIT] ${logMessage}`);
				break;
			case AuditLogger.LOG_LEVELS.WARN:
				console.warn(`[AUDIT] ${logMessage}`);
				break;
			default:
				console.info(`[AUDIT] ${logMessage}`);
		}

		// In production, also send to external audit system
		this.sendToExternalAuditSystem(logEntry);
	}

	/**
	 * Send to external audit system (placeholder)
	 */
	private sendToExternalAuditSystem(logEntry: Record<string, any>): void {
		// In a real implementation, this would send to:
		// - SIEM system
		// - Audit service
		// - Security monitoring platform
		// - Compliance logging system
		// For now, this is a placeholder
		// Implementation would depend on the specific audit requirements
	}

	/**
	 * Generate session ID for tracking related operations
	 */
	private generateSessionId(): string {
		return SecurityValidator.generateSecureRandom(16);
	}

	/**
	 * Hash IP address for privacy
	 */
	private hashIpAddress(ipAddress?: string): string | undefined {
		if (!ipAddress) return undefined;
		return SecurityValidator.hashSensitiveData(ipAddress);
	}

	/**
	 * Sanitize user agent string
	 */
	private sanitizeUserAgent(userAgent?: string): string | undefined {
		if (!userAgent) return undefined;
		// Remove potentially sensitive information but keep useful data
		return userAgent.substring(0, 200).replace(/[^\w\s\-\.\(\)\/]/g, '');
	}

	/**
	 * Hash resource IDs for privacy
	 */
	private hashResourceId(resourceId?: string): string | undefined {
		if (!resourceId) return undefined;
		return SecurityValidator.hashSensitiveData(resourceId);
	}

	/**
	 * Hash sensitive values for logging
	 */
	private hashSensitiveValue(value: any): string {
		if (value === null || value === undefined) return 'null';
		const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
		return SecurityValidator.hashSensitiveData(stringValue);
	}

	/**
	 * Sanitize OAuth scopes for logging
	 */
	private sanitizeScopes(scopes?: string): string[] | undefined {
		if (!scopes) return undefined;
		return scopes.split(',').map((scope) => scope.trim());
	}

	/**
	 * Sanitize log details to remove sensitive information
	 */
	private sanitizeLogDetails(details?: Record<string, any>): Record<string, any> | undefined {
		if (!details) return undefined;

		const sanitized: Record<string, any> = {};
		const sensitiveKeys = [
			'password',
			'secret',
			'token',
			'key',
			'credential',
			'authorization',
			'cookie',
			'session',
		];

		for (const [key, value] of Object.entries(details)) {
			const lowerKey = key.toLowerCase();
			const isSensitive = sensitiveKeys.some((sensitiveKey) => lowerKey.includes(sensitiveKey));

			if (isSensitive) {
				sanitized[key] = this.hashSensitiveValue(value);
			} else if (typeof value === 'object' && value !== null) {
				sanitized[key] = this.sanitizeLogDetails(value);
			} else {
				sanitized[key] = value;
			}
		}

		return sanitized;
	}

	/**
	 * Get violation severity level
	 */
	private getViolationSeverity(violationType: string): 'low' | 'medium' | 'high' | 'critical' {
		const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
			authentication_failure: 'high',
			rate_limit_exceeded: 'medium',
			api_operation_failure: 'medium',
			input_validation_failure: 'low',
			weak_credentials: 'high',
			test_credentials: 'medium',
			scope_violation: 'high',
			suspicious_activity: 'high',
		};

		return severityMap[violationType] || 'medium';
	}

	/**
	 * Create audit logger instance for workflow execution
	 */
	static createForExecution(node: INode, workflowId?: string, executionId?: string): AuditLogger {
		return new AuditLogger(node, workflowId, executionId);
	}
}
