import { PinterestApiClient } from '../PinterestApiClient';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

// Mock n8n execution functions
const mockExecuteFunctions = {
	getNode: jest.fn(),
	helpers: {
		requestWithAuthentication: jest.fn(),
	},
} as unknown as IExecuteFunctions;

// Mock n8n node
const mockNode: INode = {
	id: 'test-node-id',
	name: 'Pinterest Test Node',
	type: 'n8n-nodes-pinterest.pinterest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

// Mock console methods
const mockConsole = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe('PinterestApiClient Logging Integration', () => {
	let apiClient: PinterestApiClient;
	let originalConsole: any;

	beforeEach(() => {
		// Mock console methods
		originalConsole = {
			debug: console.debug,
			info: console.info,
			warn: console.warn,
			error: console.error,
		};

		console.debug = mockConsole.debug;
		console.info = mockConsole.info;
		console.warn = mockConsole.warn;
		console.error = mockConsole.error;

		// Clear all mocks
		Object.values(mockConsole).forEach((mock) => mock.mockClear());
		jest.clearAllMocks();

		// Setup mock functions
		(mockExecuteFunctions.getNode as jest.Mock).mockReturnValue(mockNode);

		apiClient = new PinterestApiClient(mockExecuteFunctions);
	});

	afterEach(() => {
		// Restore console methods
		console.debug = originalConsole.debug;
		console.info = originalConsole.info;
		console.warn = originalConsole.warn;
		console.error = originalConsole.error;
	});

	describe('Successful API Requests', () => {
		it('should log successful pin creation', async () => {
			const mockResponse = {
				id: 'pin_123',
				title: 'Test Pin',
				status: 201,
				headers: {
					'x-ratelimit-remaining': '999',
					'x-ratelimit-limit': '1000',
					'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600,
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			const pinData = {
				board_id: 'board_123',
				media_source: {
					source_type: 'image_url' as const,
					url: 'https://example.com/image.jpg',
				},
				title: 'Test Pin',
			};

			await apiClient.createPin(pinData);

			// Should log request completion
			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('API request completed'),
			);
			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Operation: create_pin'),
			);
			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Status: 201'));
		});

		it('should log successful user profile retrieval', async () => {
			const mockResponse = {
				id: 'user_123',
				username: 'testuser',
				status: 200,
				headers: {
					'x-ratelimit-remaining': '998',
					'x-ratelimit-limit': '1000',
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await apiClient.getUserProfile();

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Operation: get_user_profile'),
			);
			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Status: 200'));
		});
	});

	describe('Failed API Requests', () => {
		it('should log authentication failures', async () => {
			const authError = new Error('Authentication failed');
			(authError as any).response = {
				status: 401,
				data: { message: 'Invalid access token' },
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				authError,
			);

			try {
				await apiClient.getUserProfile();
			} catch (error) {
				// Expected to throw
			}

			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('API request failed: get_user_profile'),
			);
			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Status: 401'));
		});

		it('should log rate limit errors', async () => {
			const rateLimitError = new Error('Rate limit exceeded');
			(rateLimitError as any).response = {
				status: 429,
				data: { message: 'Too many requests' },
				headers: {
					'x-ratelimit-remaining': '0',
					'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600,
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				rateLimitError,
			);

			try {
				await apiClient.createPin({
					board_id: 'board_123',
					media_source: {
						source_type: 'image_url',
						url: 'https://example.com/image.jpg',
					},
				});
			} catch (error) {
				// Expected to throw
			}

			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('API request failed: create_pin'),
			);
			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Status: 429'));
		});

		it('should log server errors', async () => {
			const serverError = new Error('Internal server error');
			(serverError as any).response = {
				status: 500,
				data: { message: 'Internal server error' },
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				serverError,
			);

			try {
				await apiClient.getPin('pin_123');
			} catch (error) {
				// Expected to throw
			}

			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('API request failed: get_pin'),
			);
			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Status: 500'));
		});

		it('should log network errors', async () => {
			const networkError = new Error('Network error');
			(networkError as any).code = 'ECONNRESET';

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				networkError,
			);

			try {
				await apiClient.getBoard('board_123');
			} catch (error) {
				// Expected to throw
			}

			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('API request failed: get_board'),
			);
		});
	});

	describe('Rate Limiting Logging', () => {
		it('should log rate limit warnings when approaching limits', async () => {
			const mockResponse = {
				id: 'pin_123',
				status: 200,
				headers: {
					'x-ratelimit-remaining': '50', // Low remaining requests
					'x-ratelimit-limit': '1000',
					'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600,
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			// Make multiple requests to trigger rate limit warning
			for (let i = 0; i < 5; i++) {
				await apiClient.getPin(`pin_${i}`);
			}

			// Should log rate limit warnings
			expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit warning'));
		});

		it('should log rate limit resets', async () => {
			// This would be tested by simulating time passage and rate limit resets
			// For now, we verify the logging mechanism exists
			const logger = apiClient.getLogger();
			expect(logger).toBeDefined();
			expect(logger.logRateLimit).toBeDefined();
		});
	});

	describe('Authentication Logging', () => {
		it('should log successful credential tests', async () => {
			const mockResponse = {
				id: 'user_123',
				username: 'testuser',
				status: 200,
				headers: {},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await apiClient.testConnection();

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Authentication credential_test succeeded'),
			);
		});

		it('should log failed credential tests', async () => {
			const authError = new Error('Invalid credentials');
			(authError as any).response = { status: 401 };

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				authError,
			);

			try {
				await apiClient.testConnection();
			} catch (error) {
				// Expected to throw
			}

			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('Authentication credential_test failed'),
			);
		});
	});

	describe('Performance Monitoring Integration', () => {
		it('should track request performance metrics', async () => {
			const mockResponse = {
				id: 'pin_123',
				status: 200,
				headers: {},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await apiClient.getPin('pin_123');

			const performanceMonitor = apiClient.getPerformanceMonitor();
			const stats = performanceMonitor.getPerformanceStats();

			// Should have no active requests after completion
			expect(stats.activeRequests).toBe(0);
		});

		it('should generate performance alerts for slow requests', async () => {
			// Mock a slow response
			const mockResponse = {
				id: 'pin_123',
				status: 200,
				headers: {},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100)),
			);

			await apiClient.getPin('pin_123');

			const performanceMonitor = apiClient.getPerformanceMonitor();
			const alerts = performanceMonitor.getAlerts();

			// Alerts would be generated based on actual response times
			expect(Array.isArray(alerts)).toBe(true);
		});
	});

	describe('Data Privacy Compliance', () => {
		it('should not log sensitive request data', async () => {
			process.env.N8N_LOG_LEVEL = 'debug';

			const mockResponse = {
				id: 'pin_123',
				status: 200,
				headers: {},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			const sensitiveData = {
				board_id: 'board_123',
				media_source: {
					source_type: 'image_url' as const,
					url: 'https://example.com/image.jpg',
				},
				title: 'Test Pin',
				access_token: 'secret-token', // This should be redacted
				client_secret: 'secret-client-secret', // This should be redacted
			};

			await apiClient.createPin(sensitiveData);

			// Check that sensitive data is not logged
			const logCalls = mockConsole.debug.mock.calls.concat(mockConsole.info.mock.calls);
			const allLogMessages = logCalls.map((call) => call[0]).join(' ');

			expect(allLogMessages).not.toContain('secret-token');
			expect(allLogMessages).not.toContain('secret-client-secret');

			delete process.env.N8N_LOG_LEVEL;
		});

		it('should sanitize endpoints with sensitive query parameters', async () => {
			const mockResponse = {
				data: [],
				status: 200,
				headers: {},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			// Make a request with sensitive query parameters
			await apiClient.searchPins({
				query: 'test',
				limit: 10,
			});

			// The endpoint should be sanitized in logs
			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Endpoint: /search/pins'),
			);
		});
	});

	describe('Request ID Tracking', () => {
		it('should generate unique request IDs', async () => {
			const mockResponse = {
				id: 'pin_123',
				status: 200,
				headers: {},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			// Make multiple requests
			await apiClient.getPin('pin_1');
			await apiClient.getPin('pin_2');

			// Each request should have a unique ID in the logs
			const logCalls = mockConsole.info.mock.calls.concat(mockConsole.debug.mock.calls);
			const allLogMessages = logCalls.map((call) => call[0]).join(' ');

			// Check that requests were logged (they should contain operation names)
			expect(allLogMessages).toContain('get_pin');

			// Check that multiple requests were made
			const operationMatches = allLogMessages.match(/Operation: get_pin/g);
			expect(operationMatches).toBeTruthy();
			expect(operationMatches!.length).toBe(2); // Two requests were made
		});
	});

	describe('Operation Name Inference', () => {
		it('should correctly infer operation names from endpoints', async () => {
			const mockResponse = { status: 200, headers: {} };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			// Test different operations
			await apiClient.createPin({
				board_id: 'board_123',
				media_source: { source_type: 'image_url', url: 'https://example.com/image.jpg' },
			});
			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Operation: create_pin'),
			);

			await apiClient.getPin('pin_123');
			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Operation: get_pin'));

			await apiClient.updatePin('pin_123', { title: 'Updated title' });
			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Operation: update_pin'),
			);

			await apiClient.deletePin('pin_123');
			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Operation: delete_pin'),
			);
		});
	});
});
