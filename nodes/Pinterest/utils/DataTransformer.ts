import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type {
	PinResponse,
	BoardResponse,
	UserProfileResponse,
	AnalyticsResponse,
	SearchResponse,
	SearchPinsResponse,
	SearchBoardsResponse,
	TrendingResponse,
} from './types';

/**
 * Data Transformer for converting Pinterest API responses to n8n format
 * Handles input validation, data sanitization, and output formatting
 */
export class DataTransformer {
	/**
	 * Transform Pinterest pin response to n8n format
	 * @param pin Pinterest pin response
	 */
	static transformPinResponse(pin: PinResponse): IDataObject {
		return {
			pinId: pin.id,
			url: pin.url,
			title: pin.title ? this.emptyStringToNull(pin.title) : null,
			description: pin.description ? this.emptyStringToNull(pin.description) : null,
			link: pin.link ? this.emptyStringToNull(pin.link) : null,
			altText: pin.alt_text ? this.emptyStringToNull(pin.alt_text) : null,
			boardId: pin.board_id,
			boardSectionId: pin.board_section_id ? this.emptyStringToNull(pin.board_section_id) : null,
			createdAt: this.formatDateFromApi(pin.created_at),
			mediaUrl: pin.media?.url || null,
			mediaType: pin.media?.media_type || null,
			mediaWidth: this.convertToNumber(pin.media?.width),
			mediaHeight: this.convertToNumber(pin.media?.height),
			note: pin.note ? this.emptyStringToNull(pin.note) : null,
			creativeType: pin.creative_type ? this.emptyStringToNull(pin.creative_type) : null,
			isOwner: this.convertToBoolean(pin.is_owner),
			isStandard: this.convertToBoolean(pin.is_standard),
		};
	}

	/**
	 * Transform Pinterest board response to n8n format
	 * @param board Pinterest board response
	 */
	static transformBoardResponse(board: BoardResponse): IDataObject {
		return {
			boardId: board.id,
			name: board.name,
			description: board.description ? this.emptyStringToNull(board.description) : null,
			url: board.url,
			privacy: board.privacy,
			pinCount: this.convertToNumber(board.pin_count) || 0,
			followerCount: this.convertToNumber(board.follower_count) || 0,
			createdAt: this.formatDateFromApi(board.created_at),
			ownerUsername: board.owner?.username || null,
			coverPinId: board.cover_pin?.id || null,
			coverPinUrl: board.cover_pin?.url || null,
		};
	}

	/**
	 * Transform Pinterest user profile response to n8n format
	 * @param user Pinterest user profile response
	 */
	static transformUserProfile(user: UserProfileResponse): IDataObject {
		return {
			userId: user.id,
			username: user.username,
			displayName: user.display_name,
			firstName: user.first_name ? this.emptyStringToNull(user.first_name) : null,
			lastName: user.last_name ? this.emptyStringToNull(user.last_name) : null,
			bio: user.bio ? this.emptyStringToNull(user.bio) : null,
			avatarUrl: user.avatar_url ? this.emptyStringToNull(user.avatar_url) : null,
			profileUrl: user.profile_url ? this.emptyStringToNull(user.profile_url) : null,
			accountType: user.account_type,
			websiteUrl: user.website_url || null,
			isVerifiedMerchant: this.convertToBoolean(user.is_verified_merchant),
		};
	}

	/**
	 * Transform Pinterest analytics response to n8n format
	 * @param analytics Pinterest analytics response
	 */
	static transformAnalyticsResponse(analytics: AnalyticsResponse): IDataObject {
		const result: IDataObject = {};

		// Transform all-time metrics if available
		if (analytics.all_time) {
			result.allTime = analytics.all_time;
		}

		// Transform daily metrics if available
		if (analytics.daily_metrics && Array.isArray(analytics.daily_metrics)) {
			result.dailyMetrics = analytics.daily_metrics.map((metric) => ({
				...metric,
				// Ensure date fields are properly formatted
				date: metric.date || null,
			}));
		}

		return result;
	}

	/**
	 * Transform Pinterest search pins response to n8n format
	 * @param searchResponse Pinterest search pins response
	 */
	static transformSearchPinsResponse(searchResponse: SearchPinsResponse): IDataObject {
		return {
			items: searchResponse.items.map((pin) => this.transformPinResponse(pin)),
			bookmark: searchResponse.bookmark || null,
			totalItems: searchResponse.items.length,
		};
	}

	/**
	 * Transform Pinterest search boards response to n8n format
	 * @param searchResponse Pinterest search boards response
	 */
	static transformSearchBoardsResponse(searchResponse: SearchBoardsResponse): IDataObject {
		return {
			items: searchResponse.items.map((board) => this.transformBoardResponse(board)),
			bookmark: searchResponse.bookmark || null,
			totalItems: searchResponse.items.length,
		};
	}

	/**
	 * Transform Pinterest trending response to n8n format
	 * @param trendingResponse Pinterest trending response
	 */
	static transformTrendingResponse(trendingResponse: TrendingResponse): IDataObject {
		return {
			trends: trendingResponse.trends.map((trend) => ({
				keyword: trend.keyword,
				percentGrowthWeekOverWeek: trend.pct_growth_wow || null,
				percentGrowthYearOverYear: trend.pct_growth_yoy || null,
				timeSeries:
					trend.time_series?.map((ts) => ({
						date: this.formatDateFromApi(ts.date),
						value: this.convertToNumber(ts.value),
					})) || null,
			})),
			totalTrends: trendingResponse.trends.length,
		};
	}

	/**
	 * Validate and sanitize input data
	 * @param data Input data to validate
	 * @param requiredFields Required field names
	 * @param context Context for error messages
	 */
	static validateInputData(
		data: IDataObject,
		requiredFields: string[],
		context = 'operation',
	): void {
		if (!data || typeof data !== 'object') {
			throw new NodeOperationError(
				{} as any,
				`Invalid input data for ${context}: expected object, got ${typeof data}`,
			);
		}

		// Check for required fields
		const missingFields: string[] = [];
		for (const field of requiredFields) {
			if (!(field in data) || data[field] === undefined || data[field] === null) {
				missingFields.push(field);
			}
		}

		if (missingFields.length > 0) {
			throw new NodeOperationError(
				{} as any,
				`Missing required fields for ${context}: ${missingFields.join(', ')}`,
			);
		}

		// Sanitize string fields
		for (const [key, value] of Object.entries(data)) {
			if (typeof value === 'string') {
				data[key] = this.sanitizeString(value);
			}
		}
	}

	/**
	 * Validate specific field types and values
	 * @param data Input data
	 * @param fieldValidations Field validation rules
	 * @param context Context for error messages
	 */
	static validateFieldTypes(
		data: IDataObject,
		fieldValidations: Record<string, { type: string; values?: string[]; maxLength?: number }>,
		context = 'operation',
	): void {
		for (const [fieldName, validation] of Object.entries(fieldValidations)) {
			const value = data[fieldName];

			if (value === undefined || value === null) {
				continue; // Skip validation for optional fields
			}

			// Type validation
			if (validation.type === 'string' && typeof value !== 'string') {
				throw new NodeOperationError(
					{} as any,
					`Invalid type for ${fieldName} in ${context}: expected string, got ${typeof value}`,
				);
			}

			if (validation.type === 'number' && typeof value !== 'number') {
				throw new NodeOperationError(
					{} as any,
					`Invalid type for ${fieldName} in ${context}: expected number, got ${typeof value}`,
				);
			}

			if (validation.type === 'boolean' && typeof value !== 'boolean') {
				throw new NodeOperationError(
					{} as any,
					`Invalid type for ${fieldName} in ${context}: expected boolean, got ${typeof value}`,
				);
			}

			// Value validation
			if (validation.values && !validation.values.includes(value as string)) {
				throw new NodeOperationError(
					{} as any,
					`Invalid value for ${fieldName} in ${context}: must be one of ${validation.values.join(', ')}`,
				);
			}

			// Length validation
			if (
				validation.maxLength &&
				typeof value === 'string' &&
				value.length > validation.maxLength
			) {
				throw new NodeOperationError(
					{} as any,
					`Value too long for ${fieldName} in ${context}: maximum ${validation.maxLength} characters`,
				);
			}
		}
	}

	/**
	 * Sanitize string input to prevent XSS and other issues
	 * @param input String to sanitize
	 */
	static sanitizeString(input: string): string | null {
		if (typeof input !== 'string') {
			return input;
		}

		// Remove null bytes and control characters except newlines and tabs
		let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

		// Trim whitespace
		sanitized = sanitized.trim();

		// Convert empty strings to null for consistency
		return sanitized === '' ? null : sanitized;
	}

	/**
	 * Convert date strings to proper format for Pinterest API (YYYY-MM-DD)
	 * @param dateInput Date string or Date object to convert
	 */
	static formatDateForApi(dateInput: string | Date): string {
		let date: Date;

		if (typeof dateInput === 'string') {
			// Handle various date formats
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
				// Already in YYYY-MM-DD format
				return dateInput;
			}

			date = new Date(dateInput);
		} else if (dateInput instanceof Date) {
			date = dateInput;
		} else {
			throw new NodeOperationError(
				{} as any,
				`Invalid date format: expected string or Date object, got ${typeof dateInput}`,
			);
		}

		if (isNaN(date.getTime())) {
			throw new NodeOperationError({} as any, `Invalid date value: ${dateInput}`);
		}

		// Format as YYYY-MM-DD
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}`;
	}

	/**
	 * Convert date strings from Pinterest API format to ISO format
	 * @param dateString Date string from Pinterest API
	 */
	static formatDateFromApi(dateString: string): string | null {
		if (!dateString || typeof dateString !== 'string') {
			return null;
		}

		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) {
				return null;
			}
			return date.toISOString();
		} catch {
			return null;
		}
	}

	/**
	 * Convert value to number with validation
	 * @param value Value to convert to number
	 */
	static convertToNumber(value: any): number | null {
		if (value === null || value === undefined || value === '') {
			return null;
		}

		if (typeof value === 'number') {
			return isNaN(value) ? null : value;
		}

		if (typeof value === 'string') {
			const parsed = parseFloat(value);
			return isNaN(parsed) ? null : parsed;
		}

		return null;
	}

	/**
	 * Convert value to boolean with validation
	 * @param value Value to convert to boolean
	 */
	static convertToBoolean(value: any): boolean {
		if (typeof value === 'boolean') {
			return value;
		}

		if (typeof value === 'string') {
			const lower = value.toLowerCase();
			return lower === 'true' || lower === '1' || lower === 'yes';
		}

		if (typeof value === 'number') {
			return value !== 0;
		}

		return false;
	}

	/**
	 * Convert empty strings to null for consistency
	 * @param value Value to process
	 */
	static emptyStringToNull(value: any): any {
		return value === '' ? null : value;
	}

	/**
	 * Format n8n output data for workflow compatibility
	 * @param data Raw data to format
	 * @param itemIndex Item index for pairing
	 */
	static formatOutputData(
		data: IDataObject,
		itemIndex: number,
	): { json: IDataObject; pairedItem: { item: number } } {
		return {
			json: data,
			pairedItem: { item: itemIndex },
		};
	}

	/**
	 * Transform array of items to n8n execution data format
	 * @param items Array of items to transform
	 * @param itemIndex Base item index
	 */
	static formatArrayOutputData(
		items: IDataObject[],
		itemIndex: number,
	): Array<{ json: IDataObject; pairedItem: { item: number } }> {
		return items.map((item, index) => ({
			json: item,
			pairedItem: { item: itemIndex },
		}));
	}

	/**
	 * Validate Pinterest ID format
	 * @param id ID to validate
	 * @param type Type of ID (pin, board, user)
	 */
	static validatePinterestId(id: string, type: 'pin' | 'board' | 'user'): void {
		if (!id || typeof id !== 'string') {
			throw new NodeOperationError({} as any, `Invalid ${type} ID: expected non-empty string`);
		}

		// Pinterest IDs are typically alphanumeric with some special characters
		if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
			throw new NodeOperationError({} as any, `Invalid ${type} ID format: ${id}`);
		}
	}

	/**
	 * Validate URL format
	 * @param url URL to validate
	 * @param fieldName Field name for error messages
	 */
	static validateUrl(url: string, fieldName = 'URL'): void {
		if (!url || typeof url !== 'string') {
			throw new NodeOperationError({} as any, `Invalid ${fieldName}: expected non-empty string`);
		}

		try {
			new URL(url);
		} catch {
			throw new NodeOperationError({} as any, `Invalid ${fieldName} format: ${url}`);
		}
	}
}
