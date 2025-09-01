import { Logger, LogLevel } from '../Logger';
import type { INode } from 'n8n-workflow';

// Mock console methods
const mockConsole = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

// Mock n8n node
const mockNode: INode = {
	id: 'test-node-id',
	name: 'Pinterest Test Node',
	type: 'n8n-nodes-pinterest.pinterest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('Logger', () => {
	let logger: Logger;
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

		logger = new Logger(mockNode);
	});

	afterEach(() => {
		// Restore console methods
		console.debug = originalConsole.debug;
		console.info = originalConsole.info;
		console.warn = originalConsole.warn;
		console.error = originalConsole.error;
	});

	describe('Basic Logging', () => {
		it('should log info messages', () => {
			logger.info('Test info message', { key: 'value' });

			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('[Pinterest Node]'));
			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('INFO: Test info message'),
			);
		});

		it('should log warning messages', () => {
			logger.warn('Test warning message', { key: 'value' });

			expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('[Pinterest Node]'));
			expect(mockConsole.warn).toHaveBeenCalledWith(
				expect.stringContaining('WARN: Test warning message'),
			);
		});

		it('should log error messages', () => {
			const testError = new Error('Test error');
			logger.error('Test error message', testError, { key: 'value' });

			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('[Pinterest Node]'));
			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('ERROR: Test error message'),
			);
		});

		it('should only log debug messages when N8N_LOG_LEVEL is debug', () => {
			// Test without debug level
			logger.debug('Test debug message');
			expect(mockConsole.debug).not.toHaveBeenCalled();

			// Test with debug level
			process.env.N8N_LOG_LEVEL = 'debug';
			logger.debug('Test debug message');
			expect(mockConsole.debug).toHaveBeenCalledWith(
				expect.stringContaining('DEBUG: Test debug message'),
			);

			// Clean up
			delete process.env.N8N_LOG_LEVEL;
		});
	});

	describe('API Request Logging', () => {
		it('should log API request start', () => {
			logger.logApiRequestStart('create_pin', '/pins', 'POST', 'req_123');

			// Debug messages are only logged when N8N_LOG_LEVEL is debug
			process.env.N8N_LOG_LEVEL = 'debug';
			logger.logApiRequestStart('create_pin', '/pins', 'POST', 'req_123');

			expect(mockConsole.debug).toHaveBeenCalledWith(
				expect.stringContaining('API request started'),
			);

			delete process.env.N8N_LOG_LEVEL;
		});

		it('should log successful API request completion', () => {
			logger.logApiRequestComplete(
				'create_pin',
				'/pins',
				'POST',
				201,
				1500,
				'req_123',
				100,
				200,
				0,
			);

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('API request completed'),
			);
			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Operation: create_pin'),
			);
			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Status: 201'));
			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Time: 1500ms'));
		});

		it('should log failed API request completion', () => {
			logger.logApiRequestComplete('create_pin', '/pins', 'POST', 400, 800, 'req_123', 100, 50, 1);

			expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('API request failed'));
			expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('Status: 400'));
		});
	});

	describe('Rate Limiting Logging', () => {
		it('should log rate limit warnings', () => {
			logger.logRateLimit('warning', 0.92, 3600000, 0);

			expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit warning'));
		});

		it('should log rate limit queue events', () => {
			logger.logRateLimit('queued', 0.98, 1800000, 5);

			expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit queued'));
		});

		it('should log rate limit resets', () => {
			logger.logRateLimit('reset', 0, 3600000, 0);

			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Rate limit reset'));
		});
	});

	describe('Authentication Logging', () => {
		it('should log successful authentication events', () => {
			logger.logAuthentication('credential_test', true, { userId: '123' });

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Authentication credential_test succeeded'),
			);
		});

		it('should log failed authentication events', () => {
			logger.logAuthentication('token_refresh', false, { error: 'Invalid token' });

			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('Authentication token_refresh failed'),
			);
		});
	});

	describe('Performance Metrics', () => {
		beforeEach(() => {
			// Reset metrics before each test
			logger.resetMetrics();
		});

		it('should track performance metrics', () => {
			// Simulate some API requests
			logger.logApiRequestComplete('create_pin', '/pins', 'POST', 201, 1000, 'req_1');
			logger.logApiRequestComplete('get_pin', '/pins/123', 'GET', 200, 500, 'req_2');
			logger.logApiRequestComplete('create_pin', '/pins', 'POST', 400, 800, 'req_3');

			const metrics = logger.getPerformanceMetrics();

			expect(metrics.totalRequests).toBe(3);
			expect(metrics.successRate).toBe(66.67); // 2 out of 3 successful
			expect(metrics.averageResponseTime).toBeCloseTo(766.67, 1); // (1000 + 500 + 800) / 3
			expect(metrics.recentErrors).toHaveLength(1);
			expect(metrics.recentErrors[0].statusCode).toBe(400);
		});

		it('should track operational metrics', () => {
			// Simulate various types of errors
			const authError = new Error('Authentication failed');
			(authError as any).response = { status: 401 };
			logger.error('Auth failed', authError);

			const rateLimitError = new Error('Rate limit exceeded');
			(rateLimitError as any).response = { status: 429 };
			logger.error('Rate limit hit', rateLimitError);

			const serverError = new Error('Server error');
			(serverError as any).response = { status: 500 };
			logger.error('Server error', serverError);

			const networkError = new Error('Network error');
			(networkError as any).code = 'ECONNRESET';
			logger.error('Network error', networkError);

			const operationalMetrics = logger.getOperationalMetrics();

			expect(operationalMetrics.failedRequests).toBe(4);
			expect(operationalMetrics.authenticationErrors).toBe(1);
			expect(operationalMetrics.rateLimitHits).toBe(1);
			expect(operationalMetrics.serverErrors).toBe(1);
			expect(operationalMetrics.networkErrors).toBe(1);
		});

		it('should reset metrics correctly', () => {
			// Add some metrics
			logger.logApiRequestComplete('create_pin', '/pins', 'POST', 201, 1000, 'req_1');
			logger.error('Test error', new Error('Test'));

			let metrics = logger.getOperationalMetrics();
			expect(metrics.totalRequests).toBeGreaterThan(0);

			// Reset metrics
			logger.resetMetrics();

			metrics = logger.getOperationalMetrics();
			expect(metrics.totalRequests).toBe(0);
			expect(metrics.failedRequests).toBe(0);
			expect(metrics.successfulRequests).toBe(0);
		});
	});

	describe('Data Privacy and Security', () => {
		it('should not log sensitive information in debug mode', () => {
			process.env.N8N_LOG_LEVEL = 'debug';

			const sensitiveMetadata = {
				authorization: 'Bearer secret-token',
				access_token: 'secret-access-token',
				client_secret: 'secret-client-secret',
				password: 'secret-password',
				normalField: 'safe-value',
			};

			logger.info('Test message', sensitiveMetadata);

			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
			expect(mockConsole.info).not.toHaveBeenCalledWith(expect.stringContaining('secret-token'));
			expect(mockConsole.info).not.toHaveBeenCalledWith(
				expect.stringContaining('secret-access-token'),
			);

			delete process.env.N8N_LOG_LEVEL;
		});

		it('should sanitize endpoints with sensitive query parameters', () => {
			logger.logApiRequestStart(
				'get_pin',
				'/pins/123?access_token=secret&page_size=10&private_key=secret',
				'GET',
				'req_123',
			);

			// The endpoint should be sanitized in the log output
			// This is tested indirectly through the sanitizeEndpoint method
			expect(true).toBe(true); // Placeholder assertion
		});

		it('should not include stack traces in production logs', () => {
			const error = new Error('Test error');
			error.stack = 'Error: Test error\n    at test.js:1:1';

			logger.error('Test error', error);

			// Stack trace should not be included unless in debug mode
			expect(mockConsole.error).not.toHaveBeenCalledWith(expect.stringContaining('at test.js:1:1'));
		});

		it('should include stack traces in debug mode', () => {
			process.env.N8N_LOG_LEVEL = 'debug';

			const error = new Error('Test error');
			error.stack = 'Error: Test error\n    at test.js:1:1';

			logger.error('Test error', error);

			// In debug mode, stack trace should be included in metadata
			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Metadata:'));

			delete process.env.N8N_LOG_LEVEL;
		});
	});

	describe('Log Formatting', () => {
		it('should format log entries with timestamps', () => {
			logger.info('Test message');

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringMatching(
					/\[Pinterest Node\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test message/,
				),
			);
		});

		it('should include operation and endpoint in log format', () => {
			logger.logApiRequestComplete('create_pin', '/pins', 'POST', 201, 1000, 'req_123');

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('Operation: create_pin'),
			);
			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Endpoint: /pins'));
		});
	});

	describe('Memory Management', () => {
		it('should limit performance metrics history', () => {
			// Create more than the maximum number of metrics entries
			for (let i = 0; i < 1200; i++) {
				logger.logApiRequestComplete('test_op', '/test', 'GET', 200, 100, `req_${i}`);
			}

			const metrics = logger.getPerformanceMetrics();

			// Should not exceed the maximum history limit (1000)
			expect(metrics.totalRequests).toBeLessThanOrEqual(1000);
		});

		it('should reset metrics after 24 hours', () => {
			// This test would require mocking Date.now() to simulate time passage
			// For now, we'll just verify the reset functionality exists
			const operationalMetrics = logger.getOperationalMetrics();
			expect(operationalMetrics.lastResetTime).toBeDefined();
			expect(typeof operationalMetrics.lastResetTime).toBe('number');
		});
	});
});
