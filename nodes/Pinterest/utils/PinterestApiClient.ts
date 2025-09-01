import type { IRequestOptions, IExecuteFunctions, IHttpRequestMethods } from 'n8n-workflow';

import type {
	CreatePinRequest,
	UpdatePinRequest,
	CreateBoardRequest,
	UpdateBoardRequest,
	MediaUploadRequest,
	SearchParams,
	SearchPinsParams,
	SearchBoardsParams,
	TrendingParams,
	AnalyticsParams,
	PinResponse,
	BoardResponse,
	UserProfileResponse,
	MediaResponse,
	SearchResponse,
	SearchPinsResponse,
	SearchBoardsResponse,
	TrendingResponse,
	AnalyticsResponse,
} from './types';

import { RateLimiter } from './RateLimiter';
import { ErrorHandler } from './ErrorHandler';
import { Logger } from './Logger';
import { PerformanceMonitor } from './PerformanceMonitor';
import { SecurityMiddleware } from './SecurityMiddleware';
import { AuditLogger } from './AuditLogger';

/**
 * Pinterest API Client for handling all Pinterest API interactions
 * Provides comprehensive HTTP request handling with authentication, error management, logging, and performance monitoring
 */
export class PinterestApiClient {
	private rateLimiter: RateLimiter;
	private errorHandler: ErrorHandler;
	private logger: Logger;
	private performanceMonitor: PerformanceMonitor;
	private securityMiddleware: SecurityMiddleware;
	private auditLogger: AuditLogger;
	private readonly baseUrl = 'https://api.pinterest.com/v5';
	private requestCounter = 0;
	private credentials: any;

	constructor(
		private executeFunctions: IExecuteFunctions,
		itemIndex: number = 0,
	) {
		this.rateLimiter = new RateLimiter();
		this.errorHandler = new ErrorHandler(this.executeFunctions.getNode());
		this.logger = new Logger(this.executeFunctions.getNode());
		this.performanceMonitor = new PerformanceMonitor(this.logger);
		this.securityMiddleware = SecurityMiddleware.createForOperation(
			this.executeFunctions,
			this.executeFunctions.getNode(),
			itemIndex,
		);
		this.auditLogger = AuditLogger.createForExecution(
			this.executeFunctions.getNode(),
			this.executeFunctions.getWorkflow?.()?.id || 'unknown-workflow',
			this.executeFunctions.getExecutionId?.() || 'unknown-execution',
		);

		// Set logger on rate limiter for integrated logging
		if (typeof this.rateLimiter.setLogger === 'function') {
			this.rateLimiter.setLogger(this.logger);
		}
	}

	/**
	 * Make authenticated request to Pinterest API with comprehensive logging and monitoring
	 * @param method HTTP method
	 * @param endpoint API endpoint (without base URL)
	 * @param data Request body data
	 * @param options Additional request options
	 * @param operation Operation name for logging (optional)
	 */
	async makeRequest<T>(
		method: string,
		endpoint: string,
		data?: any,
		options?: IRequestOptions,
		operation?: string,
	): Promise<T> {
		// Generate unique request ID for tracking
		const requestId = `req_${++this.requestCounter}_${Date.now()}`;
		const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
		const fullUrl = `${this.baseUrl}${normalizedEndpoint}`;
		const operationName = operation || this.inferOperationFromEndpoint(method, normalizedEndpoint);

		// Start performance monitoring
		this.performanceMonitor.startRequest(requestId, operationName);

		// Log request start
		this.logger.logApiRequestStart(operationName, normalizedEndpoint, method, requestId);

		// Check rate limits before making request
		const rateLimitInfo = this.rateLimiter.getRateLimitInfo();
		if (this.rateLimiter.isApproachingLimit()) {
			this.logger.logRateLimit(
				'warning',
				(rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit,
				this.rateLimiter.getTimeUntilReset(),
				this.rateLimiter.getQueueLength(),
			);
		}

		await this.rateLimiter.checkLimit();

		const startTime = Date.now();
		let statusCode = 0;
		let responseSize = 0;
		let retryCount = 0;

		try {
			// Prepare request options
			const requestOptions: IRequestOptions = {
				method: method.toUpperCase() as IHttpRequestMethods,
				url: fullUrl,
				json: true,
				...options,
				// Ensure headers are properly merged (options spread first, then override with defaults + custom)
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					'User-Agent': 'n8n-pinterest-node/1.0.0',
					'X-Request-ID': requestId,
					...options?.headers,
				},
			};

			// Add request body if provided
			if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
				requestOptions.body = data;
			}

			// Log request details (debug level)
			this.logger.debug('Making API request', {
				requestId,
				operation: operationName,
				method: method.toUpperCase(),
				endpoint: normalizedEndpoint,
				hasBody: !!data,
				rateLimitRemaining: rateLimitInfo.remaining,
			});

			// Make authenticated request using n8n's request helper with credentials
			const response = await this.executeFunctions.helpers.requestWithAuthentication.call(
				this.executeFunctions,
				'pinterestOAuth2Api',
				requestOptions,
			);

			// Extract response information
			statusCode = response.status || 200;
			responseSize = this.calculateResponseSize(response);
			const responseTime = Date.now() - startTime;

			// Update rate limiter with response headers
			this.rateLimiter.updateFromHeaders(response.headers);

			// Log successful completion
			this.logger.logApiRequestComplete(
				operationName,
				normalizedEndpoint,
				method,
				statusCode,
				responseTime,
				requestId,
				this.calculateRequestSize(data),
				responseSize,
				retryCount,
			);

			// End performance monitoring
			this.performanceMonitor.endRequest(requestId, statusCode, responseSize, retryCount);

			return response as T;
		} catch (error) {
			// Extract error information
			statusCode = (error as any).response?.status || 500;
			const responseTime = Date.now() - startTime;

			// Log error details
			this.logger.error(`API request failed: ${operationName}`, error as Error, {
				requestId,
				operation: operationName,
				method: method.toUpperCase(),
				endpoint: normalizedEndpoint,
				statusCode,
				responseTime,
				retryCount,
			});

			// End performance monitoring with failure
			this.performanceMonitor.recordFailedRequest(requestId, error as Error);

			// Handle API errors through ErrorHandler
			throw this.errorHandler.handleApiError(error);
		}
	}

	/**
	 * Initialize and validate credentials with security checks
	 */
	async initializeCredentials(): Promise<void> {
		if (!this.credentials) {
			this.credentials = await this.securityMiddleware.validateCredentials();
		}
	}

	/**
	 * Test API connectivity and authentication with security audit
	 * @returns User profile information if successful
	 */
	async testConnection(): Promise<UserProfileResponse> {
		await this.initializeCredentials();

		this.logger.logAuthentication('credential_test', true, { endpoint: '/user_account' });
		this.auditLogger.logAuthenticationEvent('credential_test', this.credentials);

		try {
			const result = await this.makeRequest<UserProfileResponse>(
				'GET',
				'/user_account',
				undefined,
				undefined,
				'test_connection',
			);

			this.logger.logAuthentication('credential_test', true, {
				userId: result.id,
				username: result.username,
			});

			this.auditLogger.logAuthenticationEvent('success', this.credentials, {
				userId: result.id,
				username: result.username,
			});

			return result;
		} catch (error) {
			this.logger.logAuthentication('credential_test', false, { error: (error as Error).message });
			this.auditLogger.logAuthenticationEvent('failure', this.credentials, {
				error: (error as Error).message,
			});
			throw error;
		}
	}

	/**
	 * Get performance monitoring instance
	 */
	getPerformanceMonitor(): PerformanceMonitor {
		return this.performanceMonitor;
	}

	/**
	 * Get logger instance
	 */
	getLogger(): Logger {
		return this.logger;
	}

	/**
	 * Get security middleware instance
	 */
	getSecurityMiddleware(): SecurityMiddleware {
		return this.securityMiddleware;
	}

	/**
	 * Get audit logger instance
	 */
	getAuditLogger(): AuditLogger {
		return this.auditLogger;
	}

	/**
	 * Get validated credentials
	 */
	async getCredentials(): Promise<any> {
		await this.initializeCredentials();
		return this.credentials;
	}

	/**
	 * Calculate approximate request size in bytes
	 * @param data Request data
	 */
	private calculateRequestSize(data?: any): number {
		if (!data) return 0;
		try {
			return JSON.stringify(data).length;
		} catch {
			return 0;
		}
	}

	/**
	 * Calculate approximate response size in bytes
	 * @param response Response object
	 */
	private calculateResponseSize(response: any): number {
		try {
			return JSON.stringify(response).length;
		} catch {
			return 0;
		}
	}

	/**
	 * Infer operation name from HTTP method and endpoint
	 * @param method HTTP method
	 * @param endpoint API endpoint
	 */
	private inferOperationFromEndpoint(method: string, endpoint: string): string {
		const methodUpper = method.toUpperCase();
		const pathParts = endpoint.split('/').filter((part) => part && !part.match(/^[a-f0-9-]{36}$/i));

		// Remove common path prefixes
		const cleanParts = pathParts.filter((part) => part !== 'v5');

		if (cleanParts.length === 0) {
			return `${methodUpper.toLowerCase()}_unknown`;
		}

		// Build operation name
		const resource = cleanParts[0];
		const action = cleanParts[cleanParts.length - 1];

		if (methodUpper === 'GET' && action === 'analytics') {
			return `get_${resource}_analytics`;
		} else if (methodUpper === 'GET' && endpoint.includes('/search/')) {
			return `search_${resource}`;
		} else if (methodUpper === 'POST') {
			return `create_${resource}`;
		} else if (methodUpper === 'PATCH' || methodUpper === 'PUT') {
			return `update_${resource}`;
		} else if (methodUpper === 'DELETE') {
			return `delete_${resource}`;
		} else if (methodUpper === 'GET') {
			return `get_${resource}`;
		}

		return `${methodUpper.toLowerCase()}_${resource}`;
	}

	// Pin operations
	async createPin(pinData: CreatePinRequest): Promise<PinResponse> {
		await this.initializeCredentials();

		// Validate operation permissions
		this.securityMiddleware.validateOperationPermissions(this.credentials, 'create', 'pin');

		// Log API operation for audit
		const startTime = Date.now();
		try {
			const result = await this.makeRequest<PinResponse>(
				'POST',
				'/pins',
				pinData,
				undefined,
				'create_pin',
			);

			this.auditLogger.logApiOperation('create', 'pin', this.credentials, true, {
				responseTime: Date.now() - startTime,
				statusCode: 201,
				resourceId: result.id,
			});

			return result;
		} catch (error) {
			this.auditLogger.logApiOperation('create', 'pin', this.credentials, false, {
				responseTime: Date.now() - startTime,
				error: (error as Error).message,
			});
			throw error;
		}
	}

	async getPin(pinId: string): Promise<PinResponse> {
		return this.makeRequest<PinResponse>('GET', `/pins/${pinId}`, undefined, undefined, 'get_pin');
	}

	async updatePin(pinId: string, updateData: UpdatePinRequest): Promise<PinResponse> {
		await this.initializeCredentials();

		// Validate operation permissions
		this.securityMiddleware.validateOperationPermissions(this.credentials, 'update', 'pin');

		// Log API operation for audit
		const startTime = Date.now();
		try {
			const result = await this.makeRequest<PinResponse>(
				'PATCH',
				`/pins/${pinId}`,
				updateData,
				undefined,
				'update_pin',
			);

			this.auditLogger.logApiOperation('update', 'pin', this.credentials, true, {
				responseTime: Date.now() - startTime,
				statusCode: 200,
				resourceId: pinId,
			});

			return result;
		} catch (error) {
			this.auditLogger.logApiOperation('update', 'pin', this.credentials, false, {
				responseTime: Date.now() - startTime,
				error: (error as Error).message,
				resourceId: pinId,
			});
			throw error;
		}
	}

	async deletePin(pinId: string): Promise<void> {
		await this.initializeCredentials();

		// Validate operation permissions
		this.securityMiddleware.validateOperationPermissions(this.credentials, 'delete', 'pin');

		// Log API operation for audit
		const startTime = Date.now();
		try {
			const result = await this.makeRequest<void>(
				'DELETE',
				`/pins/${pinId}`,
				undefined,
				undefined,
				'delete_pin',
			);

			this.auditLogger.logApiOperation('delete', 'pin', this.credentials, true, {
				responseTime: Date.now() - startTime,
				statusCode: 204,
				resourceId: pinId,
			});

			return result;
		} catch (error) {
			this.auditLogger.logApiOperation('delete', 'pin', this.credentials, false, {
				responseTime: Date.now() - startTime,
				error: (error as Error).message,
				resourceId: pinId,
			});
			throw error;
		}
	}

	// Board operations
	async createBoard(boardData: CreateBoardRequest): Promise<BoardResponse> {
		return this.makeRequest<BoardResponse>('POST', '/boards', boardData, undefined, 'create_board');
	}

	async getBoard(boardId: string): Promise<BoardResponse> {
		return this.makeRequest<BoardResponse>(
			'GET',
			`/boards/${boardId}`,
			undefined,
			undefined,
			'get_board',
		);
	}

	async updateBoard(boardId: string, updateData: UpdateBoardRequest): Promise<BoardResponse> {
		return this.makeRequest<BoardResponse>(
			'PATCH',
			`/boards/${boardId}`,
			updateData,
			undefined,
			'update_board',
		);
	}

	async deleteBoard(boardId: string): Promise<void> {
		return this.makeRequest<void>(
			'DELETE',
			`/boards/${boardId}`,
			undefined,
			undefined,
			'delete_board',
		);
	}

	// Media operations
	async uploadMedia(mediaData: MediaUploadRequest): Promise<MediaResponse> {
		// For media upload, we need to use multipart/form-data
		const formData = new FormData();
		formData.append('media_type', mediaData.media_type);

		// Handle file data
		if (mediaData.file instanceof Buffer) {
			// Convert Buffer to Blob for FormData
			const blob = new Blob([mediaData.file]);
			formData.append('file', blob);
		} else {
			formData.append('file', mediaData.file);
		}

		return this.makeRequest<MediaResponse>(
			'POST',
			'/media',
			formData,
			{
				headers: {
					// Remove Content-Type header to let the browser set it with boundary
					'Content-Type': undefined,
				},
			},
			'upload_media',
		);
	}

	/**
	 * Get media upload status (if supported by Pinterest API)
	 * Note: Pinterest API v5 doesn't have a direct endpoint for this
	 * This is a placeholder for future API updates
	 */
	async getMediaStatus(mediaId: string): Promise<MediaResponse> {
		// This would be the endpoint if Pinterest supported it
		// return this.makeRequest<MediaResponse>('GET', `/media/${mediaId}`);

		// For now, return a placeholder response
		return {
			media_id: mediaId,
			media_type: 'image', // We don't know the actual type
			status: 'succeeded', // Assume success for now
		};
	}

	// User operations
	async getUserProfile(): Promise<UserProfileResponse> {
		return this.makeRequest<UserProfileResponse>(
			'GET',
			'/user_account',
			undefined,
			undefined,
			'get_user_profile',
		);
	}

	async getUserAnalytics(params: AnalyticsParams): Promise<AnalyticsResponse> {
		const queryParams = new URLSearchParams({
			start_date: params.start_date,
			end_date: params.end_date,
		});

		if (params.metric_types && params.metric_types.length > 0) {
			queryParams.append('metric_types', params.metric_types.join(','));
		}

		if (params.app_types && params.app_types.length > 0) {
			queryParams.append('app_types', params.app_types.join(','));
		}

		if (params.split_field) {
			queryParams.append('split_field', params.split_field);
		}

		if (params.ad_account_id) {
			queryParams.append('ad_account_id', params.ad_account_id);
		}

		return this.makeRequest<AnalyticsResponse>(
			'GET',
			`/user_account/analytics?${queryParams.toString()}`,
		);
	}

	async getPinAnalytics(pinId: string, params?: AnalyticsParams): Promise<AnalyticsResponse> {
		let endpoint = `/pins/${pinId}/analytics`;

		if (params) {
			const queryParams = new URLSearchParams({
				start_date: params.start_date,
				end_date: params.end_date,
			});

			if (params.metric_types && params.metric_types.length > 0) {
				queryParams.append('metric_types', params.metric_types.join(','));
			}

			if (params.app_types && params.app_types.length > 0) {
				queryParams.append('app_types', params.app_types.join(','));
			}

			if (params.split_field) {
				queryParams.append('split_field', params.split_field);
			}

			endpoint += `?${queryParams.toString()}`;
		}

		return this.makeRequest<AnalyticsResponse>('GET', endpoint);
	}

	async getBoardAnalytics(boardId: string, params?: AnalyticsParams): Promise<AnalyticsResponse> {
		let endpoint = `/boards/${boardId}/analytics`;

		if (params) {
			const queryParams = new URLSearchParams({
				start_date: params.start_date,
				end_date: params.end_date,
			});

			if (params.metric_types && params.metric_types.length > 0) {
				queryParams.append('metric_types', params.metric_types.join(','));
			}

			if (params.app_types && params.app_types.length > 0) {
				queryParams.append('app_types', params.app_types.join(','));
			}

			if (params.split_field) {
				queryParams.append('split_field', params.split_field);
			}

			endpoint += `?${queryParams.toString()}`;
		}

		return this.makeRequest<AnalyticsResponse>('GET', endpoint);
	}

	// Search operations
	async searchPins(params: SearchPinsParams): Promise<SearchPinsResponse> {
		const queryParams = new URLSearchParams({
			query: params.query,
		});

		if (params.limit) {
			queryParams.append('page_size', params.limit.toString());
		}

		if (params.bookmark) {
			queryParams.append('bookmark', params.bookmark);
		}

		if (params.creative_types && params.creative_types.length > 0) {
			queryParams.append('creative_types', params.creative_types.join(','));
		}

		if (params.created_at) {
			queryParams.append('created_at', params.created_at);
		}

		if (params.is_promoted !== undefined) {
			queryParams.append('is_promoted', params.is_promoted.toString());
		}

		if (params.has_product !== undefined) {
			queryParams.append('has_product', params.has_product.toString());
		}

		if (params.is_eligible_for_related_products !== undefined) {
			queryParams.append(
				'is_eligible_for_related_products',
				params.is_eligible_for_related_products.toString(),
			);
		}

		return this.makeRequest<SearchPinsResponse>('GET', `/search/pins?${queryParams.toString()}`);
	}

	async searchBoards(params: SearchBoardsParams): Promise<SearchBoardsResponse> {
		const queryParams = new URLSearchParams({
			query: params.query,
		});

		if (params.limit) {
			queryParams.append('page_size', params.limit.toString());
		}

		if (params.bookmark) {
			queryParams.append('bookmark', params.bookmark);
		}

		return this.makeRequest<SearchBoardsResponse>(
			'GET',
			`/search/boards?${queryParams.toString()}`,
		);
	}

	async getTrending(params?: TrendingParams): Promise<TrendingResponse> {
		const queryParams = new URLSearchParams();

		if (params?.region) {
			queryParams.append('region', params.region);
		}

		if (params?.trending_types && params.trending_types.length > 0) {
			queryParams.append('trending_types', params.trending_types.join(','));
		}

		const queryString = queryParams.toString();
		const endpoint = queryString ? `/trends/feed?${queryString}` : '/trends/feed';

		return this.makeRequest<TrendingResponse>('GET', endpoint);
	}
}
