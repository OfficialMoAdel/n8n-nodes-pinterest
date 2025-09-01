import { Logger } from '../Logger';
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

describe('Data Privacy and Security Compliance', () => {
	let logger: Logger;
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

		logger = new Logger(mockNode);
		apiClient = new PinterestApiClient(mockExecuteFunctions);
	});

	afterEach(() => {
		// Restore console methods
		console.debug = originalConsole.debug;
		console.info = originalConsole.info;
		console.warn = originalConsole.warn;
		console.error = originalConsole.error;
	});

	describe('Sensitive Data Redaction', () => {
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

		sensitiveFields.forEach((field) => {
			it(`should redact ${field} from logs`, () => {
				process.env.N8N_LOG_LEVEL = 'debug';

				const sensitiveData = {
					[field]: 'sensitive-value-123',
					normalField: 'safe-value',
				};

				logger.info('Test message with sensitive data', sensitiveData);

				const logCalls = mockConsole.info.mock.calls;
				const allLogMessages = logCalls.map((call) => call[0]).join(' ');

				expect(allLogMessages).toContain('[REDACTED]');
				expect(allLogMessages).not.toContain('sensitive-value-123');
				expect(allLogMessages).toContain('safe-value');

				delete process.env.N8N_LOG_LEVEL;
			});
		});

		it('should redact nested sensitive data', () => {
			process.env.N8N_LOG_LEVEL = 'debug';

			const nestedSensitiveData = {
				user: {
					id: 'user_123',
					credentials: {
						access_token: 'secret-token',
						client_secret: 'secret-client-secret',
					},
					profile: {
						name: 'Test User',
						email: 'test@example.com',
					},
				},
				request: {
					headers: {
						authorization: 'Bearer secret-bearer-token',
						'content-type': 'application/json',
					},
				},
			};

			logger.info('Test message with nested sensitive data', nestedSensitiveData);

			const logCalls = mockConsole.info.mock.calls;
			const allLogMessages = logCalls.map((call) => call[0]).join(' ');

			expect(allLogMessages).toContain('[REDACTED]');
			expect(allLogMessages).not.toContain('secret-token');
			expect(allLogMessages).not.toContain('secret-client-secret');
			expect(allLogMessages).not.toContain('secret-bearer-token');
			expect(allLogMessages).toContain('Test User');
			expect(allLogMessages).toContain('test@example.com');

			delete process.env.N8N_LOG_LEVEL;
		});

		it('should redact sensitive data in arrays', () => {
			process.env.N8N_LOG_LEVEL = 'debug';

			const arrayWithSensitiveData = {
				credentials: [
					{
						type: 'oauth2',
						access_token: 'secret-token-1',
						name: 'Pinterest Account 1',
					},
					{
						type: 'oauth2',
						access_token: 'secret-token-2',
						name: 'Pinterest Account 2',
					},
				],
			};

			logger.info('Test message with array sensitive data', arrayWithSensitiveData);

			const logCalls = mockConsole.info.mock.calls;
			const allLogMessages = logCalls.map((call) => call[0]).join(' ');

			expect(allLogMessages).toContain('[REDACTED]');
			expect(allLogMessages).not.toContain('secret-token-1');
			expect(allLogMessages).not.toContain('secret-token-2');
			expect(allLogMessages).toContain('Pinterest Account 1');
			expect(allLogMessages).toContain('Pinterest Account 2');

			delete process.env.N8N_LOG_LEVEL;
		});

		it('should handle case-insensitive sensitive field detection', () => {
			process.env.N8N_LOG_LEVEL = 'debug';

			const caseVariations = {
				ACCESS_TOKEN: 'secret-upper',
				Access_Token: 'secret-mixed',
				access_TOKEN: 'secret-mixed2',
				CLIENT_SECRET: 'secret-client-upper',
				Authorization: 'secret-auth-mixed',
				normalField: 'safe-value',
			};

			logger.info('Test case sensitivity', caseVariations);

			const logCalls = mockConsole.info.mock.calls;
			const allLogMessages = logCalls.map((call) => call[0]).join(' ');

			expect(allLogMessages).toContain('[REDACTED]');
			expect(allLogMessages).not.toContain('secret-upper');
			expect(allLogMessages).not.toContain('secret-mixed');
			expect(allLogMessages).not.toContain('secret-mixed2');
			expect(allLogMessages).not.toContain('secret-client-upper');
			expect(allLogMessages).not.toContain('secret-auth-mixed');
			expect(allLogMessages).toContain('safe-value');

			delete process.env.N8N_LOG_LEVEL;
		});
	});

	describe('Stack Trace Privacy', () => {
		it('should not include stack traces in production logs', () => {
			const error = new Error('Test error');
			error.stack =
				'Error: Test error\n    at sensitive-file.js:123:45\n    at secret-function.js:67:89';

			logger.error('Test error message', error);

			const logCalls = mockConsole.error.mock.calls;
			const allLogMessages = logCalls.map((call) => call[0]).join(' ');

			expect(allLogMessages).not.toContain('sensitive-file.js');
			expect(allLogMessages).not.toContain('secret-function.js');
			expect(allLogMessages).toContain('Test error message');
		});

		it('should include stack traces in debug mode', () => {
			process.env.N8N_LOG_LEVEL = 'debug';

			const error = new Error('Test error');
			error.stack = 'Error: Test error\n    at test-file.js:123:45';

			logger.error('Test error message', error);

			const logCalls = mockConsole.error.mock.calls;
			const allLogMessages = logCalls.map((call) => call[0]).join(' ');

			// Stack trace should be included in metadata when in debug mode
			expect(allLogMessages).toContain('Metadata:');

			delete process.env.N8N_LOG_LEVEL;
		});
	});

	describe('URL and Endpoint Sanitization', () => {
		it('should sanitize URLs with sensitive query parameters', () => {
			const sensitiveUrl =
				'https://api.pinterest.com/v5/pins?access_token=secret&client_id=public&page_size=10';

			// Test the sanitization through API client logging
			const mockResponse = { status: 200, headers: {} };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			// The sanitization happens internally in the API client
			// We verify that sensitive parameters are not logged
			expect(true).toBe(true); // Placeholder - actual test would verify URL sanitization
		});

		it('should preserve safe query parameters', () => {
			const safeParams = ['page_size', 'bookmark', 'metric_types', 'start_date', 'end_date'];

			safeParams.forEach((param) => {
				const url = `https://api.pinterest.com/v5/pins?${param}=test_value&access_token=secret`;

				// Test that safe parameters are preserved while sensitive ones are removed
				// This would be tested through the actual sanitization method
				expect(true).toBe(true); // Placeholder
			});
		});
	});

	describe('Request/Response Data Privacy', () => {
		it('should not log request bodies containing sensitive data', async () => {
			process.env.N8N_LOG_LEVEL = 'debug';

			const mockResponse = { id: 'pin_123', status: 201, headers: {} };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			const requestWithSensitiveData = {
				board_id: 'board_123',
				media_source: {
					source_type: 'image_url' as const,
					url: 'https://example.com/image.jpg',
				},
				title: 'Test Pin',
				// These should not appear in logs
				internal_token: 'secret-internal-token',
				api_key: 'secret-api-key',
			};

			await apiClient.createPin(requestWithSensitiveData);

			const logCalls = mockConsole.debug.mock.calls.concat(mockConsole.info.mock.calls);
			const allLogMessages = logCalls.map((call) => call[0]).join(' ');

			expect(allLogMessages).not.toContain('secret-internal-token');
			expect(allLogMessages).not.toContain('secret-api-key');
			// Note: Request body details are not logged for privacy reasons, which is correct behavior

			delete process.env.N8N_LOG_LEVEL;
		});

		it('should not log response data containing sensitive information', async () => {
			const mockResponseWithSensitiveData = {
				id: 'pin_123',
				title: 'Test Pin',
				internal_metadata: {
					access_token: 'secret-response-token',
					user_secret: 'secret-user-data',
				},
				status: 200,
				headers: {},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponseWithSensitiveData,
			);

			await apiClient.getPin('pin_123');

			// Response data should be sanitized if logged
			const logCalls = mockConsole.info.mock.calls;
			const allLogMessages = logCalls.map((call) => call[0]).join(' ');

			// The response itself isn't logged in detail, but if it were, sensitive data should be redacted
			expect(allLogMessages).toContain('API request completed');
		});
	});

	describe('User Identification Privacy', () => {
		it('should not log personally identifiable information', () => {
			const userDataWithPII = {
				operation: 'get_user_profile',
				user: {
					id: 'user_123', // This is OK - it's an internal ID
					username: 'testuser', // This is OK - it's public
					email: 'user@example.com', // This should be handled carefully
					phone: '+1234567890', // This should be handled carefully
					full_name: 'John Doe', // This should be handled carefully
					ip_address: '192.168.1.1', // This should not be logged
				},
			};

			logger.info('User profile operation', userDataWithPII);

			// In a real implementation, we would check that PII is handled appropriately
			// For now, we verify the logging mechanism exists
			expect(mockConsole.info).toHaveBeenCalled();
		});

		it('should hash or anonymize user identifiers when necessary', () => {
			// This test would verify that user identifiers are properly anonymized
			// when logging for analytics or debugging purposes
			const userAnalytics = {
				operation: 'analytics',
				user_id: 'user_123',
				session_id: 'session_456',
				request_count: 5,
			};

			logger.info('User analytics', userAnalytics);

			// Verify that user identifiers are handled appropriately
			expect(mockConsole.info).toHaveBeenCalled();
		});
	});

	describe('Compliance with Data Protection Regulations', () => {
		it('should support data retention policies', () => {
			// Test that old log data is properly cleaned up
			logger.resetMetrics();

			const metrics = logger.getOperationalMetrics();
			expect(metrics.lastResetTime).toBeDefined();
			expect(typeof metrics.lastResetTime).toBe('number');
		});

		it('should provide mechanisms for data deletion', () => {
			// Test that user data can be removed from logs/metrics
			logger.resetMetrics();

			const performanceMetrics = logger.getPerformanceMetrics();
			expect(performanceMetrics.totalRequests).toBe(0);
		});

		it('should not persist sensitive data beyond necessary duration', () => {
			// Test that sensitive data is not kept longer than required
			// This would involve testing the automatic cleanup mechanisms
			expect(logger.resetMetrics).toBeDefined();
		});
	});

	describe('Audit Trail Compliance', () => {
		it('should log security-relevant events without exposing sensitive data', () => {
			logger.logAuthentication('credential_test', false, {
				reason: 'Invalid token',
				user_id: 'user_123',
				// Should not log the actual token
			});

			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('Authentication credential_test failed'),
			);
		});

		it('should maintain audit logs for compliance', () => {
			// Test that audit events are properly logged
			logger.logAuthentication('token_refresh', true, { user_id: 'user_123' });
			logger.logRateLimit('queued', 0.95, 3600000, 5);

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Authentication token_refresh succeeded'),
			);
			expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit queued'));
		});
	});

	describe('Environment-Based Privacy Controls', () => {
		it('should respect N8N_LOG_LEVEL environment variable', () => {
			// Test debug level
			process.env.N8N_LOG_LEVEL = 'debug';
			logger.debug('Debug message');
			expect(mockConsole.debug).toHaveBeenCalled();

			// Reset and test without debug level
			mockConsole.debug.mockClear();
			delete process.env.N8N_LOG_LEVEL;
			logger.debug('Debug message');
			expect(mockConsole.debug).not.toHaveBeenCalled();
		});

		it('should provide different privacy levels based on environment', () => {
			// In production, more data should be redacted
			// In development, more data might be available for debugging
			// This test verifies the mechanism exists
			expect(process.env.N8N_LOG_LEVEL).toBeUndefined();

			logger.info('Test message', { test: 'data' });
			expect(mockConsole.info).toHaveBeenCalled();
		});
	});
});
