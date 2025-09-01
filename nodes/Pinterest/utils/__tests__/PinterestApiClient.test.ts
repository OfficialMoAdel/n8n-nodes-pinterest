import { PinterestApiClient } from '../PinterestApiClient';
import { RateLimiter } from '../RateLimiter';
import { ErrorHandler } from '../ErrorHandler';
import type { IExecuteFunctions, IRequestOptions, NodeApiError } from 'n8n-workflow';

// Mock the dependencies
jest.mock('../RateLimiter');
jest.mock('../ErrorHandler');

describe('PinterestApiClient', () => {
	let apiClient: PinterestApiClient;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockRateLimiter: jest.Mocked<RateLimiter>;
	let mockErrorHandler: jest.Mocked<ErrorHandler>;
	let mockHttpRequestWithAuth: jest.Mock;

	beforeEach(() => {
		// Mock the HTTP request method
		mockHttpRequestWithAuth = jest.fn();

		// Mock execute functions
		mockExecuteFunctions = {
			getNode: jest
				.fn()
				.mockReturnValue({ name: 'Pinterest', type: 'n8n-nodes-pinterest.pinterest' }),
			helpers: {
				requestWithAuthentication: {
					call: mockHttpRequestWithAuth,
				},
			},
		} as any;

		// Mock rate limiter
		mockRateLimiter = {
			checkLimit: jest.fn().mockResolvedValue(undefined),
			updateFromHeaders: jest.fn(),
			getRateLimitInfo: jest.fn(),
		} as any;

		// Mock error handler
		mockErrorHandler = {
			handleApiError: jest.fn(),
		} as any;

		// Mock the constructors
		(RateLimiter as jest.MockedClass<typeof RateLimiter>).mockImplementation(() => mockRateLimiter);
		(ErrorHandler as jest.MockedClass<typeof ErrorHandler>).mockImplementation(
			() => mockErrorHandler,
		);

		// Create API client instance
		apiClient = new PinterestApiClient(mockExecuteFunctions);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Constructor', () => {
		it('should initialize with correct dependencies', () => {
			expect(RateLimiter).toHaveBeenCalledTimes(1);
			expect(ErrorHandler).toHaveBeenCalledWith(mockExecuteFunctions.getNode());
		});

		it('should store executeFunctions', () => {
			expect(apiClient).toBeDefined();
			expect(apiClient['executeFunctions']).toBe(mockExecuteFunctions);
		});
	});

	describe('makeRequest', () => {
		const mockResponse = { id: 'test-id', name: 'test-response' };

		beforeEach(() => {
			mockHttpRequestWithAuth.mockResolvedValue(mockResponse);
		});

		it('should make authenticated request with correct parameters', async () => {
			const result = await apiClient.makeRequest('GET', '/test-endpoint');

			expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(1);
			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				{
					method: 'GET',
					url: 'https://api.pinterest.com/v5/test-endpoint',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						'User-Agent': 'n8n-pinterest-node/1.0.0',
					},
					json: true,
				},
			);
			expect(result).toBe(mockResponse);
		});

		it('should normalize endpoint path by adding leading slash', async () => {
			await apiClient.makeRequest('GET', 'test-endpoint');

			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				expect.objectContaining({
					url: 'https://api.pinterest.com/v5/test-endpoint',
				}),
			);
		});

		it('should include request body for POST requests', async () => {
			const requestData = { name: 'test-board', description: 'test description' };

			await apiClient.makeRequest('POST', '/boards', requestData);

			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					body: requestData,
				}),
			);
		});

		it('should include request body for PUT requests', async () => {
			const requestData = { name: 'updated-board' };

			await apiClient.makeRequest('PUT', '/boards/123', requestData);

			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				expect.objectContaining({
					method: 'PUT',
					body: requestData,
				}),
			);
		});

		it('should include request body for PATCH requests', async () => {
			const requestData = { description: 'updated description' };

			await apiClient.makeRequest('PATCH', '/pins/123', requestData);

			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				expect.objectContaining({
					method: 'PATCH',
					body: requestData,
				}),
			);
		});

		it('should not include request body for GET requests', async () => {
			await apiClient.makeRequest('GET', '/pins/123');

			const callArgs = mockHttpRequestWithAuth.mock.calls[0][2] as IRequestOptions;
			expect(callArgs.body).toBeUndefined();
		});

		it('should not include request body for DELETE requests', async () => {
			await apiClient.makeRequest('DELETE', '/pins/123');

			const callArgs = mockHttpRequestWithAuth.mock.calls[0][2] as IRequestOptions;
			expect(callArgs.body).toBeUndefined();
		});

		it('should merge custom headers with default headers', async () => {
			const customOptions = {
				headers: {
					'Custom-Header': 'custom-value',
					'Content-Type': 'multipart/form-data', // Override default
				},
			};

			await apiClient.makeRequest('POST', '/media', null, customOptions);

			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				expect.objectContaining({
					headers: {
						Accept: 'application/json',
						'Content-Type': 'multipart/form-data',
						'User-Agent': 'n8n-pinterest-node/1.0.0',
						'Custom-Header': 'custom-value',
					},
				}),
			);
		});

		it('should update rate limiter with response headers', async () => {
			const responseWithHeaders = {
				...mockResponse,
				headers: {
					'x-ratelimit-remaining': '950',
					'x-ratelimit-reset': '1640995200',
				},
			};
			mockHttpRequestWithAuth.mockResolvedValue(responseWithHeaders);

			await apiClient.makeRequest('GET', '/test-endpoint');

			expect(mockRateLimiter.updateFromHeaders).toHaveBeenCalledWith(responseWithHeaders.headers);
		});

		it('should handle response without headers gracefully', async () => {
			const responseWithoutHeaders = { ...mockResponse };
			mockHttpRequestWithAuth.mockResolvedValue(responseWithoutHeaders);

			await apiClient.makeRequest('GET', '/test-endpoint');

			expect(mockRateLimiter.updateFromHeaders).toHaveBeenCalledWith(undefined);
		});

		it('should handle API errors through ErrorHandler', async () => {
			const apiError = new Error('API Error');
			const handledError = new Error('Handled Error') as NodeApiError;

			mockHttpRequestWithAuth.mockRejectedValue(apiError);
			mockErrorHandler.handleApiError.mockReturnValue(handledError);

			await expect(apiClient.makeRequest('GET', '/test-endpoint')).rejects.toBe(handledError);
			expect(mockErrorHandler.handleApiError).toHaveBeenCalledWith(apiError);
		});

		it('should convert method to uppercase', async () => {
			await apiClient.makeRequest('get', '/test-endpoint');

			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				expect.objectContaining({
					method: 'GET',
				}),
			);
		});
	});

	describe('testConnection', () => {
		it('should make GET request to user_account endpoint', async () => {
			const mockUserProfile = {
				id: 'test-user-id',
				username: 'testuser',
				display_name: 'Test User',
			};
			mockHttpRequestWithAuth.mockResolvedValue(mockUserProfile);

			const result = await apiClient.testConnection();

			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					url: 'https://api.pinterest.com/v5/user_account',
				}),
			);
			expect(result).toBe(mockUserProfile);
		});

		it('should propagate errors from makeRequest', async () => {
			const error = new Error('Connection failed');
			mockErrorHandler.handleApiError.mockReturnValue(error as NodeApiError);
			mockHttpRequestWithAuth.mockRejectedValue(error);

			await expect(apiClient.testConnection()).rejects.toBe(error);
		});
	});

	describe('Rate Limiting Integration', () => {
		it('should check rate limits before each request', async () => {
			mockHttpRequestWithAuth.mockResolvedValue({});

			await apiClient.makeRequest('GET', '/test-endpoint');

			expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(1);
		});

		it('should handle rate limit check failures', async () => {
			const rateLimitError = new Error('Rate limit exceeded');
			mockRateLimiter.checkLimit.mockRejectedValue(rateLimitError);

			await expect(apiClient.makeRequest('GET', '/test-endpoint')).rejects.toBe(rateLimitError);
			expect(mockHttpRequestWithAuth).not.toHaveBeenCalled();
		});
	});

	describe('Base URL Configuration', () => {
		it('should use correct Pinterest API v5 base URL', async () => {
			mockHttpRequestWithAuth.mockResolvedValue({});

			await apiClient.makeRequest('GET', '/test');

			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				expect.objectContaining({
					url: 'https://api.pinterest.com/v5/test',
				}),
			);
		});
	});

	describe('Authentication Integration', () => {
		it('should use pinterestOAuth2Api credential name', async () => {
			mockHttpRequestWithAuth.mockResolvedValue({});

			await apiClient.makeRequest('GET', '/test');

			expect(mockHttpRequestWithAuth).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'pinterestOAuth2Api',
				expect.any(Object),
			);
		});
	});
});
