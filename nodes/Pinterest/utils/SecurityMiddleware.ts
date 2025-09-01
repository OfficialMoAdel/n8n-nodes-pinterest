import {
	type IExecuteFunctions,
	type ICredentialDataDecryptedObject,
	type INode,
	NodeOperationError,
} from 'n8n-workflow';
import { SecurityValidator } from './SecurityValidator';
import { CredentialSecurityValidator } from './CredentialSecurityValidator';
import { AuditLogger } from './AuditLogger';

/**
 * Security Middleware for Pinterest Node
 * Integrates all security components and provides centralized security enforcement
 */
export class SecurityMiddleware {
	private securityValidator: SecurityValidator;
	private credentialValidator: CredentialSecurityValidator;
	private auditLogger: AuditLogger;

	constructor(
		private executeFunctions: IExecuteFunctions,
		private node: INode,
		private itemIndex: number = 0,
	) {
		this.securityValidator = new SecurityValidator(node);
		this.credentialValidator = new CredentialSecurityValidator(node);
		this.auditLogger = AuditLogger.createForExecution(
			node,
			executeFunctions.getWorkflow?.()?.id || 'unknown-workflow',
			executeFunctions.getExecutionId?.() || 'unknown-execution',
		);
	}

	/**
	 * Validate and secure credentials before use
	 */
	async validateCredentials(): Promise<ICredentialDataDecryptedObject> {
		try {
			const credentials = await this.executeFunctions.getCredentials('pinterestOAuth2Api');

			// Validate credential security
			this.credentialValidator.validateCredentials(credentials);

			// Log credential validation
			this.auditLogger.logCredentialSecurityEvent('validation', credentials, {
				validation_result: 'success',
			});

			return credentials;
		} catch (error) {
			// Log credential validation failure
			this.auditLogger.logCredentialSecurityEvent('validation', {} as any, {
				validation_result: 'failure',
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	/**
	 * Validate operation permissions
	 */
	validateOperationPermissions(
		credentials: ICredentialDataDecryptedObject,
		operation: string,
		resource: string,
	): void {
		try {
			this.credentialValidator.validateOperationPermissions(credentials, operation, resource);
		} catch (error) {
			// Log permission violation
			this.auditLogger.logCredentialSecurityEvent('scope_violation', credentials, {
				operation,
				resource,
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw error;
		}
	}

	/**
	 * Sanitize and validate pin creation parameters
	 */
	sanitizePinCreateParams(params: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};

		try {
			// Validate and sanitize board ID
			sanitized.boardId = this.securityValidator.validatePinterestId(params.boardId, 'Board ID');

			// Validate media source
			const mediaSource = params.mediaSource;
			if (!mediaSource || !['url', 'upload'].includes(mediaSource)) {
				throw new NodeOperationError(this.node, 'Invalid media source: must be "url" or "upload"');
			}
			sanitized.mediaSource = mediaSource;

			// Sanitize media URL if provided
			if (mediaSource === 'url' && params.mediaUrl) {
				sanitized.mediaUrl = this.securityValidator.sanitizeUrl(params.mediaUrl, 'Media URL');
			}

			// Validate file upload if provided
			if (mediaSource === 'upload' && params.mediaFile) {
				this.securityValidator.validateFileUpload(params.mediaFile, 'Media File');
				sanitized.mediaFile = params.mediaFile;
			}

			// Sanitize optional text fields
			sanitized.title = this.securityValidator.sanitizePinTitle(params.title);
			sanitized.description = this.securityValidator.sanitizeDescription(params.description);
			sanitized.altText = this.securityValidator.sanitizeString(params.altText, 'Alt Text', 500);

			// Sanitize link URL if provided
			if (params.link !== undefined) {
				sanitized.link = params.link
					? this.securityValidator.sanitizeUrl(params.link, 'Link URL')
					: '';
			}

			return sanitized;
		} catch (error) {
			// Log validation failure
			this.auditLogger.logValidationFailure(
				'pin_create_params',
				params,
				error instanceof Error ? error.message : 'Unknown validation error',
			);

			throw error;
		}
	}

	/**
	 * Sanitize and validate pin update parameters
	 */
	sanitizePinUpdateParams(params: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};

		try {
			// Validate pin ID
			sanitized.pinId = this.securityValidator.validatePinterestId(params.pinId, 'Pin ID');

			// Sanitize optional fields
			if (params.title !== undefined) {
				sanitized.title = this.securityValidator.sanitizePinTitle(params.title);
			}

			if (params.description !== undefined) {
				sanitized.description = this.securityValidator.sanitizeDescription(params.description);
			}

			if (params.altText !== undefined) {
				sanitized.altText = this.securityValidator.sanitizeString(params.altText, 'Alt Text', 500);
			}

			if (params.link !== undefined) {
				sanitized.link = params.link
					? this.securityValidator.sanitizeUrl(params.link, 'Link URL')
					: '';
			}

			if (params.boardId !== undefined) {
				sanitized.boardId = this.securityValidator.validatePinterestId(params.boardId, 'Board ID');
			}

			return sanitized;
		} catch (error) {
			this.auditLogger.logValidationFailure(
				'pin_update_params',
				params,
				error instanceof Error ? error.message : 'Unknown validation error',
			);

			throw error;
		}
	}

	/**
	 * Sanitize and validate board creation parameters
	 */
	sanitizeBoardCreateParams(params: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};

		try {
			// Validate required name
			if (!params.name) {
				throw new NodeOperationError(this.node, 'Board name is required');
			}
			sanitized.name = this.securityValidator.sanitizeString(params.name, 'Board Name', 180);

			// Sanitize optional description
			if (params.description !== undefined) {
				sanitized.description = this.securityValidator.sanitizeDescription(params.description);
			}

			// Validate privacy setting
			sanitized.privacy = this.securityValidator.validatePrivacySetting(params.privacy);

			return sanitized;
		} catch (error) {
			this.auditLogger.logValidationFailure(
				'board_create_params',
				params,
				error instanceof Error ? error.message : 'Unknown validation error',
			);

			throw error;
		}
	}

	/**
	 * Sanitize and validate board update parameters
	 */
	sanitizeBoardUpdateParams(params: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};

		try {
			// Validate board ID
			sanitized.boardId = this.securityValidator.validatePinterestId(params.boardId, 'Board ID');

			// Sanitize optional fields
			if (params.name !== undefined) {
				sanitized.name = this.securityValidator.sanitizeString(params.name, 'Board Name', 180);
			}

			if (params.description !== undefined) {
				sanitized.description = this.securityValidator.sanitizeDescription(params.description);
			}

			if (params.privacy !== undefined) {
				sanitized.privacy = this.securityValidator.validatePrivacySetting(params.privacy);
			}

			return sanitized;
		} catch (error) {
			this.auditLogger.logValidationFailure(
				'board_update_params',
				params,
				error instanceof Error ? error.message : 'Unknown validation error',
			);

			throw error;
		}
	}

	/**
	 * Sanitize and validate search parameters
	 */
	sanitizeSearchParams(params: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};

		try {
			// Validate search query
			sanitized.query = this.securityValidator.validateSearchQuery(params.query);

			// Validate numeric parameters
			if (params.limit !== undefined) {
				sanitized.limit = this.securityValidator.validateNumericParameter(
					params.limit,
					'Limit',
					1,
					250,
				);
			}

			// Validate bookmark (pagination token)
			if (params.bookmark !== undefined) {
				sanitized.bookmark = this.securityValidator.sanitizeString(
					params.bookmark,
					'Bookmark',
					500,
				);
			}

			// Validate array parameters
			if (params.creativeTypes !== undefined) {
				const allowedTypes = ['regular', 'video', 'shopping', 'carousel', 'max_video', 'story'];
				sanitized.creativeTypes = this.securityValidator.validateArrayParameter(
					params.creativeTypes,
					'Creative Types',
					allowedTypes,
					10,
				);
			}

			// Validate date parameters
			if (params.createdAt !== undefined) {
				sanitized.createdAt = this.securityValidator.validateDateParameter(
					params.createdAt,
					'Created At',
				);
			}

			// Validate boolean parameters
			if (params.isPromoted !== undefined) {
				sanitized.isPromoted = this.securityValidator.validateBooleanParameter(
					params.isPromoted,
					'Is Promoted',
				);
			}

			if (params.hasProduct !== undefined) {
				sanitized.hasProduct = this.securityValidator.validateBooleanParameter(
					params.hasProduct,
					'Has Product',
				);
			}

			return sanitized;
		} catch (error) {
			this.auditLogger.logValidationFailure(
				'search_params',
				params,
				error instanceof Error ? error.message : 'Unknown validation error',
			);

			throw error;
		}
	}

	/**
	 * Sanitize and validate analytics parameters
	 */
	sanitizeAnalyticsParams(params: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};

		try {
			// Validate required date range
			if (!params.startDate || !params.endDate) {
				throw new NodeOperationError(
					this.node,
					'Start date and end date are required for analytics',
				);
			}

			sanitized.startDate = this.securityValidator.validateDateParameter(
				params.startDate,
				'Start Date',
			);
			sanitized.endDate = this.securityValidator.validateDateParameter(params.endDate, 'End Date');

			// Validate date range
			const startDate = new Date(sanitized.startDate!);
			const endDate = new Date(sanitized.endDate!);

			if (startDate >= endDate) {
				throw new NodeOperationError(this.node, 'Start date must be before end date');
			}

			// Validate date range length (max 1 year)
			const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
			if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
				throw new NodeOperationError(this.node, 'Date range cannot exceed 1 year');
			}

			// Validate metric types
			if (params.metricTypes !== undefined) {
				const allowedMetrics = [
					'IMPRESSION',
					'SAVE',
					'PIN_CLICK',
					'OUTBOUND_CLICK',
					'QUARTILE_95_PERCENT_VIEW',
				];
				sanitized.metricTypes = this.securityValidator.validateArrayParameter(
					params.metricTypes,
					'Metric Types',
					allowedMetrics,
					10,
				);
			}

			return sanitized;
		} catch (error) {
			this.auditLogger.logValidationFailure(
				'analytics_params',
				params,
				error instanceof Error ? error.message : 'Unknown validation error',
			);

			throw error;
		}
	}

	/**
	 * Log API operation for audit trail
	 */
	logApiOperation(
		operation: string,
		resource: string,
		credentials: ICredentialDataDecryptedObject,
		success: boolean,
		details?: Record<string, any>,
	): void {
		this.auditLogger.logApiOperation(operation, resource, credentials, success, details);
	}

	/**
	 * Log authentication event
	 */
	logAuthenticationEvent(
		event: 'success' | 'failure' | 'token_refresh' | 'credential_test',
		credentials: ICredentialDataDecryptedObject,
		details?: Record<string, any>,
	): void {
		this.auditLogger.logAuthenticationEvent(event, credentials, details);
	}

	/**
	 * Log rate limiting event
	 */
	logRateLimitEvent(
		event: 'approaching' | 'exceeded' | 'reset',
		credentials: ICredentialDataDecryptedObject,
		rateLimitInfo: { limit?: number; remaining?: number; reset?: number },
	): void {
		this.auditLogger.logRateLimitEvent(event, credentials, rateLimitInfo);
	}

	/**
	 * Log security violation
	 */
	logSecurityViolation(violationType: string, details: Record<string, any>): void {
		this.auditLogger.logSecurityViolation(violationType, details);
	}

	/**
	 * Get parameter value with security validation
	 */
	getSecureParameter<T = any>(parameterName: string, fallback?: T): T {
		try {
			return this.executeFunctions.getNodeParameter(parameterName, this.itemIndex, fallback) as T;
		} catch (error) {
			this.auditLogger.logValidationFailure(
				parameterName,
				'parameter_access_failed',
				error instanceof Error ? error.message : 'Unknown error',
			);
			throw error;
		}
	}

	/**
	 * Create security middleware instance for operation
	 */
	static createForOperation(
		executeFunctions: IExecuteFunctions,
		node: INode,
		itemIndex: number = 0,
	): SecurityMiddleware {
		return new SecurityMiddleware(executeFunctions, node, itemIndex);
	}
}
