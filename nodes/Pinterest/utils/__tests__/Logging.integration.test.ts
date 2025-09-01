import { PinterestApiClient } from '../PinterestApiClient';
import { Logger } from '../Logger';
import { PerformanceMonitor } from '../PerformanceMonitor';
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

describe('Logging Integration Tests', () => {
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

	describe('End-to-End Logging Flow', () => {
		it('should log complete request lifecycle with performance monitoring', async () => {
			const mockResponse = {
				id: 'pin_123',
				title: 'Test Pin',
				status: 200,
				headers: {
					'x-ratelimit-remaining': '999',
					'x-ratelimit-limit': '1000',
					'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600,
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			// Make API request
			const result = await apiClient.getPin('pin_123');

			// Verify the result
			expect(result).toEqual(mockResponse);

			// Verify logging occurred
			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('API request completed'),
			);
			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Operation: get_pin'));
			expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Status: 200'));

			// Verify performance monitoring
			const performanceMonitor = apiClient.getPerformanceMonitor();
			const stats = performanceMonitor.getPerformanceStats();
			expect(stats.activeRequests).toBe(0); // Request should be completed
		});

		it('should handle errors with comprehensive logging', async () => {
			const authError = new Error('Authentication failed');
			(authError as any).response = {
				status: 401,
				data: { message: 'Invalid access token' },
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				authError,
			);

			// Make API request that will fail
			try {
				await apiClient.getUserProfile();
				fail('Expected error to be thrown');
			} catch (error) {
				// Expected to throw
			}

			// Verify error logging
			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('API request failed: get_user_profile'),
			);
			expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Status: 401'));

			// Verify performance monitoring recorded the failure
			const performanceMonitor = apiClient.getPerformanceMonitor();
			const alerts = performanceMonitor.getAlerts();
			expect(alerts.length).toBeGreaterThan(0);
		});

		it('should track operational metrics across multiple requests', async () => {
			const mockResponse = { status: 200, headers: {} };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			// Make multiple requests
			await apiClient.getPin('pin_1');
			await apiClient.getPin('pin_2');
			await apiClient.getUserProfile();

			// Check operational metrics
			const logger = apiClient.getLogger();
			const operationalMetrics = logger.getOperationalMetrics();

			expect(operationalMetrics.totalRequests).toBeGreaterThan(0);
			expect(operationalMetrics.successfulRequests).toBeGreaterThan(0);
		});

		it('should respect debug logging environment variable', async () => {
			// Test without debug mode
			const mockResponse = { status: 200, headers: {} };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await apiClient.getPin('pin_123');

			// Debug messages should not be logged
			const debugCalls = mockConsole.debug.mock.calls;
			expect(debugCalls.length).toBe(0);

			// Clear mocks and enable debug mode
			mockConsole.debug.mockClear();
			process.env.N8N_LOG_LEVEL = 'debug';

			await apiClient.getPin('pin_456');

			// Debug messages should now be logged
			expect(mockConsole.debug).toHaveBeenCalled();

			// Clean up
			delete process.env.N8N_LOG_LEVEL;
		});

		it('should sanitize sensitive data in logs', async () => {
			process.env.N8N_LOG_LEVEL = 'debug';

			const mockResponse = { status: 200, headers: {} };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await apiClient.getPin('pin_123');

			// Check that no sensitive data is logged
			const allLogCalls = mockConsole.debug.mock.calls
				.concat(mockConsole.info.mock.calls)
				.concat(mockConsole.warn.mock.calls)
				.concat(mockConsole.error.mock.calls);

			const allLogMessages = allLogCalls.map((call) => call[0]).join(' ');

			// Should not contain sensitive patterns
			expect(allLogMessages).not.toContain('secret');
			expect(allLogMessages).not.toContain('token');
			expect(allLogMessages).not.toContain('password');

			delete process.env.N8N_LOG_LEVEL;
		});
	});

	describe('Performance Monitoring Integration', () => {
		it('should generate alerts for slow requests', async () => {
			// Mock a slow response
			const mockResponse = { status: 200, headers: {} };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100)),
			);

			await apiClient.getPin('pin_123');

			const performanceMonitor = apiClient.getPerformanceMonitor();
			const report = performanceMonitor.generateReport();

			expect(report.summary.totalRequests).toBe(1);
			expect(report.summary.successRate).toBe(100);
			expect(report.recommendations).toBeDefined();
		});

		it('should track rate limiting events', async () => {
			const mockResponse = {
				status: 200,
				headers: {
					'x-ratelimit-remaining': '10', // Low remaining requests
					'x-ratelimit-limit': '1000',
					'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600,
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			// Make multiple requests to trigger rate limit warnings
			for (let i = 0; i < 3; i++) {
				await apiClient.getPin(`pin_${i}`);
			}

			// Should log rate limit warnings
			expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit warning'));
		});
	});

	describe('Logger and PerformanceMonitor Integration', () => {
		it('should provide comprehensive performance reports', async () => {
			const logger = new Logger(mockNode);
			const performanceMonitor = new PerformanceMonitor(logger);

			// Add some metrics to the logger first
			logger.logApiRequestComplete('create_pin', '/pins', 'POST', 201, 100, 'req_1', 50, 100, 0);
			logger.logApiRequestComplete('get_pin', '/pins/123', 'GET', 200, 50, 'req_2', 0, 50, 0);
			logger.logApiRequestComplete('update_pin', '/pins/123', 'PATCH', 400, 80, 'req_3', 30, 40, 1);

			// Simulate some requests in performance monitor
			performanceMonitor.startRequest('req_1', 'create_pin');
			performanceMonitor.endRequest('req_1', 201, 100, 0);

			performanceMonitor.startRequest('req_2', 'get_pin');
			performanceMonitor.endRequest('req_2', 200, 50, 0);

			performanceMonitor.startRequest('req_3', 'update_pin');
			performanceMonitor.endRequest('req_3', 400, 80, 1);

			const report = performanceMonitor.generateReport();

			expect(report.thresholds).toBeDefined();
			expect(Array.isArray(report.recommendations)).toBe(true);
			expect(report.summary).toBeDefined();
		});

		it('should handle concurrent requests properly', async () => {
			const mockResponse = { status: 200, headers: {} };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			// Make concurrent requests
			const promises = [
				apiClient.getPin('pin_1'),
				apiClient.getPin('pin_2'),
				apiClient.getPin('pin_3'),
			];

			await Promise.all(promises);

			// All requests should complete successfully
			const logger = apiClient.getLogger();
			const performanceMetrics = logger.getPerformanceMetrics();
			expect(performanceMetrics.totalRequests).toBe(3);
		});
	});

	describe('Memory Management', () => {
		it('should limit metrics history to prevent memory leaks', async () => {
			const logger = apiClient.getLogger();

			// Simulate many requests
			for (let i = 0; i < 50; i++) {
				logger.logApiRequestComplete(
					'test_operation',
					'/test',
					'GET',
					200,
					100,
					`req_${i}`,
					50,
					100,
					0,
				);
			}

			const performanceMetrics = logger.getPerformanceMetrics();
			expect(performanceMetrics.totalRequests).toBeLessThanOrEqual(50);
		});

		it('should allow metrics reset', async () => {
			const logger = apiClient.getLogger();

			// Add some metrics
			logger.logApiRequestComplete('test_op', '/test', 'GET', 200, 100, 'req_1');
			logger.error('Test error', new Error('Test'));

			let operationalMetrics = logger.getOperationalMetrics();
			expect(operationalMetrics.totalRequests).toBeGreaterThan(0);

			// Reset metrics
			logger.resetMetrics();

			operationalMetrics = logger.getOperationalMetrics();
			expect(operationalMetrics.totalRequests).toBe(0);
			expect(operationalMetrics.failedRequests).toBe(0);
		});
	});
});
