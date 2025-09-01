import { NodeOperationError, type INode } from 'n8n-workflow';
import { createHash, randomBytes } from 'crypto';

/**
 * Security Validator for Pinterest Node
 * Provides input sanitization, validation, and security checks
 */
export class SecurityValidator {
	private static readonly MAX_STRING_LENGTH = 10000;
	private static readonly MAX_URL_LENGTH = 2048;
	private static readonly MAX_DESCRIPTION_LENGTH = 500;
	private static readonly MAX_TITLE_LENGTH = 100;
	private static readonly ALLOWED_PROTOCOLS = ['http:', 'https:'];
	private static readonly DANGEROUS_PATTERNS = [
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
		/javascript:/gi,
		/vbscript:/gi,
		/data:text\/html/gi,
		/on\w+\s*=/gi,
	];

	constructor(private node: INode) {}

	/**
	 * Sanitize and validate string input
	 */
	sanitizeString(input: string | undefined, fieldName: string, maxLength?: number): string {
		if (input === undefined || input === null) {
			return '';
		}

		if (typeof input !== 'string') {
			throw new NodeOperationError(
				this.node,
				`Invalid input type for ${fieldName}: expected string, got ${typeof input}`,
			);
		}

		// Check length limits
		const limit = maxLength || SecurityValidator.MAX_STRING_LENGTH;
		if (input.length > limit) {
			throw new NodeOperationError(
				this.node,
				`Input too long for ${fieldName}: maximum ${limit} characters allowed`,
			);
		}

		// Remove dangerous patterns
		let sanitized = input;
		for (const pattern of SecurityValidator.DANGEROUS_PATTERNS) {
			sanitized = sanitized.replace(pattern, '');
		}

		// Remove null bytes and control characters (except newlines and tabs)
		sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

		// Trim whitespace
		sanitized = sanitized.trim();

		return sanitized;
	}

	/**
	 * Validate and sanitize URL input
	 */
	sanitizeUrl(input: string | undefined, fieldName: string): string {
		if (!input) {
			return '';
		}

		const sanitized = this.sanitizeString(input, fieldName, SecurityValidator.MAX_URL_LENGTH);

		if (!sanitized) {
			return '';
		}

		try {
			const url = new URL(sanitized);

			// Check protocol whitelist
			if (!SecurityValidator.ALLOWED_PROTOCOLS.includes(url.protocol)) {
				throw new NodeOperationError(
					this.node,
					`Invalid protocol for ${fieldName}: only HTTP and HTTPS are allowed`,
				);
			}

			// Check for suspicious patterns in URL
			const suspiciousPatterns = [/javascript:/i, /vbscript:/i, /data:/i, /file:/i, /ftp:/i];

			for (const pattern of suspiciousPatterns) {
				if (pattern.test(sanitized)) {
					throw new NodeOperationError(
						this.node,
						`Potentially dangerous URL detected for ${fieldName}`,
					);
				}
			}

			return url.toString();
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeOperationError(this.node, `Invalid URL format for ${fieldName}: ${sanitized}`);
		}
	}

	/**
	 * Validate Pinterest ID format (alphanumeric with specific length)
	 */
	validatePinterestId(id: string | undefined, fieldName: string): string {
		if (!id) {
			throw new NodeOperationError(this.node, `${fieldName} is required`);
		}

		const sanitized = this.sanitizeString(id, fieldName, 50);

		// Pinterest IDs are typically alphanumeric with specific patterns
		const pinterestIdPattern = /^[a-zA-Z0-9_-]+$/;
		if (!pinterestIdPattern.test(sanitized)) {
			throw new NodeOperationError(
				this.node,
				`Invalid ${fieldName} format: must contain only letters, numbers, hyphens, and underscores`,
			);
		}

		if (sanitized.length < 1 || sanitized.length > 50) {
			throw new NodeOperationError(
				this.node,
				`Invalid ${fieldName} length: must be between 1 and 50 characters`,
			);
		}

		return sanitized;
	}

	/**
	 * Validate and sanitize pin title
	 */
	sanitizePinTitle(title: string | undefined): string {
		return this.sanitizeString(title, 'title', SecurityValidator.MAX_TITLE_LENGTH);
	}

	/**
	 * Validate and sanitize pin/board description
	 */
	sanitizeDescription(description: string | undefined): string {
		return this.sanitizeString(
			description,
			'description',
			SecurityValidator.MAX_DESCRIPTION_LENGTH,
		);
	}

	/**
	 * Validate board privacy setting
	 */
	validatePrivacySetting(privacy: string | undefined): 'public' | 'protected' | 'secret' {
		if (!privacy) {
			return 'public'; // Default to public
		}

		const sanitized = this.sanitizeString(privacy, 'privacy', 20).toLowerCase();
		const validPrivacySettings = ['public', 'protected', 'secret'];

		if (!validPrivacySettings.includes(sanitized)) {
			throw new NodeOperationError(
				this.node,
				`Invalid privacy setting: must be one of ${validPrivacySettings.join(', ')}`,
			);
		}

		return sanitized as 'public' | 'protected' | 'secret';
	}

	/**
	 * Validate file upload data
	 */
	validateFileUpload(fileData: any, fieldName: string): void {
		if (!fileData) {
			throw new NodeOperationError(this.node, `${fieldName} is required for file upload`);
		}

		// Check if it's a proper file object
		if (typeof fileData !== 'object') {
			throw new NodeOperationError(
				this.node,
				`Invalid ${fieldName}: expected file object, got ${typeof fileData}`,
			);
		}

		// Validate file size (10MB for images, 100MB for videos)
		const maxImageSize = 10 * 1024 * 1024; // 10MB
		const maxVideoSize = 100 * 1024 * 1024; // 100MB

		if (fileData.size) {
			const isVideo = this.isVideoFile(fileData.mimeType || fileData.type);
			const maxSize = isVideo ? maxVideoSize : maxImageSize;

			if (fileData.size > maxSize) {
				const maxSizeMB = maxSize / (1024 * 1024);
				throw new NodeOperationError(
					this.node,
					`File too large: maximum ${maxSizeMB}MB allowed for ${isVideo ? 'videos' : 'images'}`,
				);
			}
		}

		// Validate MIME type
		const mimeType = fileData.mimeType || fileData.type;
		if (mimeType && !this.isAllowedMimeType(mimeType)) {
			throw new NodeOperationError(
				this.node,
				`Unsupported file type: ${mimeType}. Allowed types: JPEG, PNG, GIF, MP4, MOV`,
			);
		}
	}

	/**
	 * Check if MIME type is allowed
	 */
	private isAllowedMimeType(mimeType: string): boolean {
		const allowedTypes = [
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/gif',
			'video/mp4',
			'video/quicktime', // .mov files
		];

		return allowedTypes.includes(mimeType.toLowerCase());
	}

	/**
	 * Check if file is a video
	 */
	private isVideoFile(mimeType: string): boolean {
		return Boolean(mimeType && mimeType.startsWith('video/'));
	}

	/**
	 * Validate search query parameters
	 */
	validateSearchQuery(query: string | undefined): string {
		if (!query) {
			throw new NodeOperationError(this.node, 'Search query is required');
		}

		const sanitized = this.sanitizeString(query, 'search query', 500);

		if (sanitized.length < 1) {
			throw new NodeOperationError(this.node, 'Search query cannot be empty');
		}

		// Check for SQL injection patterns
		const sqlInjectionPatterns = [
			/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
			/(--|\/\*|\*\/|;)/g,
			/(\b(OR|AND)\b.*=.*)/gi,
		];

		for (const pattern of sqlInjectionPatterns) {
			if (pattern.test(sanitized)) {
				throw new NodeOperationError(
					this.node,
					'Search query contains potentially dangerous patterns',
				);
			}
		}

		return sanitized;
	}

	/**
	 * Validate numeric parameters
	 */
	validateNumericParameter(
		value: any,
		fieldName: string,
		min?: number,
		max?: number,
	): number | undefined {
		if (value === undefined || value === null || value === '') {
			return undefined;
		}

		const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);

		if (isNaN(num)) {
			throw new NodeOperationError(
				this.node,
				`Invalid ${fieldName}: must be a valid number, got ${value}`,
			);
		}

		if (min !== undefined && num < min) {
			throw new NodeOperationError(
				this.node,
				`Invalid ${fieldName}: must be at least ${min}, got ${num}`,
			);
		}

		if (max !== undefined && num > max) {
			throw new NodeOperationError(
				this.node,
				`Invalid ${fieldName}: must be at most ${max}, got ${num}`,
			);
		}

		return num;
	}

	/**
	 * Validate date parameters
	 */
	validateDateParameter(value: string | undefined, fieldName: string): string | undefined {
		if (!value) {
			return undefined;
		}

		const sanitized = this.sanitizeString(value, fieldName, 50);

		// Check ISO date format (YYYY-MM-DD)
		const datePattern = /^\d{4}-\d{2}-\d{2}$/;
		if (!datePattern.test(sanitized)) {
			throw new NodeOperationError(
				this.node,
				`Invalid ${fieldName} format: must be YYYY-MM-DD, got ${sanitized}`,
			);
		}

		// Validate actual date
		const date = new Date(sanitized);
		if (isNaN(date.getTime())) {
			throw new NodeOperationError(this.node, `Invalid ${fieldName}: not a valid date`);
		}

		// Check reasonable date range (not too far in past/future)
		const now = new Date();
		const minDate = new Date(now.getFullYear() - 10, 0, 1); // 10 years ago
		const maxDate = new Date(now.getFullYear() + 1, 11, 31); // 1 year in future

		if (date < minDate || date > maxDate) {
			throw new NodeOperationError(
				this.node,
				`Invalid ${fieldName}: date must be within reasonable range`,
			);
		}

		return sanitized;
	}

	/**
	 * Generate secure random string for nonces/tokens
	 */
	static generateSecureRandom(length: number = 32): string {
		return randomBytes(length).toString('hex');
	}

	/**
	 * Hash sensitive data for logging
	 */
	static hashSensitiveData(data: string): string {
		return createHash('sha256').update(data).digest('hex').substring(0, 8);
	}

	/**
	 * Validate array parameters
	 */
	validateArrayParameter(
		value: any,
		fieldName: string,
		allowedValues?: string[],
		maxLength?: number,
	): string[] | undefined {
		if (!value) {
			return undefined;
		}

		let array: string[];

		if (Array.isArray(value)) {
			array = value;
		} else if (typeof value === 'string') {
			// Handle comma-separated strings
			array = value.split(',').map((item) => item.trim());
		} else {
			throw new NodeOperationError(
				this.node,
				`Invalid ${fieldName}: expected array or comma-separated string`,
			);
		}

		// Validate length
		if (maxLength && array.length > maxLength) {
			throw new NodeOperationError(
				this.node,
				`Too many items in ${fieldName}: maximum ${maxLength} allowed`,
			);
		}

		// Sanitize each item
		const sanitizedArray = array.map((item) => this.sanitizeString(item, `${fieldName} item`, 100));

		// Validate against allowed values
		if (allowedValues) {
			for (const item of sanitizedArray) {
				if (!allowedValues.includes(item)) {
					throw new NodeOperationError(
						this.node,
						`Invalid value in ${fieldName}: ${item}. Allowed values: ${allowedValues.join(', ')}`,
					);
				}
			}
		}

		return sanitizedArray.filter((item) => item.length > 0);
	}

	/**
	 * Validate boolean parameters
	 */
	validateBooleanParameter(value: any, fieldName: string): boolean | undefined {
		if (value === undefined || value === null || value === '') {
			return undefined;
		}

		if (typeof value === 'boolean') {
			return value;
		}

		if (typeof value === 'string') {
			const lower = value.toLowerCase().trim();
			if (lower === 'true' || lower === '1' || lower === 'yes') {
				return true;
			}
			if (lower === 'false' || lower === '0' || lower === 'no') {
				return false;
			}
		}

		throw new NodeOperationError(
			this.node,
			`Invalid ${fieldName}: expected boolean value, got ${value}`,
		);
	}
}
