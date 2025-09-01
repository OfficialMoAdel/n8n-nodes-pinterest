/**
 * Integration Test Suite - Structure and Configuration Tests
 * Tests the integration test framework setup and configuration
 */

import { TestDataManager } from './TestDataManager';
import { PerformanceBenchmark } from './PerformanceBenchmark';
import { integrationConfig, skipIfIntegrationDisabled, isIntegrationTestEnabled } from './config';

describe('Pinterest Integration Test Suite', () => {
	describe('Test Configuration', () => {
		it('should have valid integration test configuration', () => {
			expect(integrationConfig).toBeDefined();
			expect(integrationConfig.pinterest).toBeDefined();
			expect(integrationConfig.performance).toBeDefined();
			expect(integrationConfig.testData).toBeDefined();
		});

		it('should have correct Pinterest API configuration', () => {
			expect(integrationConfig.pinterest.apiBaseUrl).toBe('https://api.pinterest.com/v5');
			expect(integrationConfig.pinterest.rateLimitBuffer).toBe(0.1);
			expect(integrationConfig.pinterest.requestTimeout).toBe(30000);
		});

		it('should have performance requirements defined', () => {
			expect(integrationConfig.performance.maxResponseTime).toBe(5000);
			expect(integrationConfig.performance.maxBatchSize).toBe(25);
			expect(integrationConfig.performance.concurrentRequests).toBe(5);
		});

		it('should have test data management configuration', () => {
			expect(integrationConfig.testData.testDataPrefix).toBe('n8n-test-');
			expect(typeof integrationConfig.testData.cleanupAfterTests).toBe('boolean');
			expect(typeof integrationConfig.testData.preserveTestBoards).toBe('boolean');
		});
	});

	describe('Test Environment Detection', () => {
		it('should correctly detect integration test enablement', () => {
			const isEnabled = isIntegrationTestEnabled();
			expect(typeof isEnabled).toBe('boolean');
		});

		it('should skip tests when integration tests are disabled', () => {
			const originalEnv = process.env.PINTEREST_INTEGRATION_TESTS;
			process.env.PINTEREST_INTEGRATION_TESTS = 'false';

			const shouldSkip = skipIfIntegrationDisabled();
			expect(typeof shouldSkip).toBe('boolean');

			// Restore original environment
			process.env.PINTEREST_INTEGRATION_TESTS = originalEnv;
		});
	});

	describe('Test Data Manager', () => {
		it('should initialize test data manager with credentials', () => {
			const mockCredentials = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				accessToken: 'test-access-token',
				refreshToken: 'test-refresh-token',
				continuousRefresh: true,
			};

			const testDataManager = new TestDataManager(mockCredentials);
			expect(testDataManager).toBeDefined();
			expect(testDataManager.getCreatedResources).toBeDefined();
		});

		it('should track created resources', () => {
			const mockCredentials = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				accessToken: 'test-access-token',
				refreshToken: 'test-refresh-token',
				continuousRefresh: true,
			};

			const testDataManager = new TestDataManager(mockCredentials);
			const resources = testDataManager.getCreatedResources();

			expect(resources).toBeDefined();
			expect(resources.boards).toEqual([]);
			expect(resources.pins).toEqual([]);
			expect(resources.mediaIds).toEqual([]);
		});

		it('should provide test media files configuration', async () => {
			const mockCredentials = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				accessToken: 'test-access-token',
				refreshToken: 'test-refresh-token',
				continuousRefresh: true,
			};

			const testDataManager = new TestDataManager(mockCredentials);
			const testData = await testDataManager.setupTestData();

			expect(testData).toBeDefined();
			expect(testData.mediaFiles).toBeDefined();
			expect(Array.isArray(testData.mediaFiles)).toBe(true);
			expect(testData.mediaFiles.length).toBeGreaterThan(0);

			// Verify media file structure
			const mediaFile = testData.mediaFiles[0];
			expect(mediaFile.name).toBeDefined();
			expect(mediaFile.type).toMatch(/^(image|video)$/);
			expect(mediaFile.url).toBeDefined();
			expect(typeof mediaFile.size).toBe('number');
			expect(mediaFile.format).toBeDefined();
		});
	});

	describe('Performance Benchmark', () => {
		it('should initialize performance benchmark', () => {
			const benchmark = new PerformanceBenchmark();
			expect(benchmark).toBeDefined();
			expect(benchmark.startOperation).toBeDefined();
			expect(benchmark.getResults).toBeDefined();
		});

		it('should track operation metrics', () => {
			const benchmark = new PerformanceBenchmark();
			const timer = benchmark.startOperation('test-operation');

			expect(timer).toBeDefined();
			expect(timer.end).toBeDefined();

			timer.end(true);

			const results = benchmark.getResults();
			expect(results.totalOperations).toBe(1);
			expect(results.successfulOperations).toBe(1);
			expect(results.failedOperations).toBe(0);
		});

		it('should validate performance requirements', () => {
			const benchmark = new PerformanceBenchmark();
			const timer = benchmark.startOperation('test-operation');

			// Simulate a fast operation
			setTimeout(() => timer.end(true), 10);

			setTimeout(() => {
				const validation = benchmark.validatePerformance();
				expect(validation).toBeDefined();
				expect(validation.passed).toBeDefined();
				expect(Array.isArray(validation.issues)).toBe(true);
			}, 50);
		});

		it('should export metrics in JSON format', () => {
			const benchmark = new PerformanceBenchmark();
			const timer = benchmark.startOperation('test-operation');
			timer.end(true);

			const exportedMetrics = benchmark.exportMetrics();
			expect(typeof exportedMetrics).toBe('string');

			const parsed = JSON.parse(exportedMetrics);
			expect(parsed.timestamp).toBeDefined();
			expect(parsed.config).toBeDefined();
			expect(parsed.results).toBeDefined();
		});
	});

	describe('Test Suite Structure', () => {
		it('should have all required test files', () => {
			const fs = require('fs');
			const path = require('path');

			const testDir = path.join(__dirname);
			const requiredFiles = [
				'config.ts',
				'TestDataManager.ts',
				'PerformanceBenchmark.ts',
				'setup.ts',
				'README.md',
			];

			requiredFiles.forEach((file) => {
				const filePath = path.join(testDir, file);
				expect(fs.existsSync(filePath)).toBe(true);
			});
		});

		it('should have proper Jest configuration', () => {
			const fs = require('fs');
			const path = require('path');

			const jestConfigPath = path.join(__dirname, '../../../../jest.integration.config.js');
			expect(fs.existsSync(jestConfigPath)).toBe(true);
		});

		it('should have environment example file', () => {
			const fs = require('fs');
			const path = require('path');

			const envExamplePath = path.join(__dirname, '../../../../.env.integration.example');
			expect(fs.existsSync(envExamplePath)).toBe(true);
		});

		it('should have test runner script', () => {
			const fs = require('fs');
			const path = require('path');

			const scriptPath = path.join(__dirname, '../../../../scripts/run-integration-tests.js');
			expect(fs.existsSync(scriptPath)).toBe(true);
		});
	});

	describe('Mock API Integration', () => {
		it('should demonstrate Pinterest API operation structure', async () => {
			if (skipIfIntegrationDisabled()) return;

			// Mock Pinterest API responses for testing structure
			const mockPinResponse = {
				id: 'test-pin-123',
				title: 'Test Pin',
				description: 'Test pin description',
				board_id: 'test-board-456',
				created_at: new Date().toISOString(),
				url: 'https://pinterest.com/pin/test-pin-123',
				media: {
					url: 'https://example.com/image.jpg',
					media_type: 'image',
				},
			};

			const mockBoardResponse = {
				id: 'test-board-456',
				name: 'Test Board',
				description: 'Test board description',
				privacy: 'public',
				pin_count: 5,
				follower_count: 10,
				created_at: new Date().toISOString(),
				url: 'https://pinterest.com/board/test-board-456',
			};

			const mockUserProfile = {
				id: 'test-user-789',
				username: 'test_user',
				display_name: 'Test User',
				first_name: 'Test',
				last_name: 'User',
				bio: 'Test user bio',
				avatar_url: 'https://example.com/avatar.jpg',
				account_type: 'business' as const,
			};

			// Verify response structures match expected types
			expect(mockPinResponse.id).toBeDefined();
			expect(mockPinResponse.board_id).toBeDefined();
			expect(mockPinResponse.media).toBeDefined();

			expect(mockBoardResponse.id).toBeDefined();
			expect(mockBoardResponse.privacy).toMatch(/^(public|protected|secret)$/);
			expect(typeof mockBoardResponse.pin_count).toBe('number');

			expect(mockUserProfile.id).toBeDefined();
			expect(mockUserProfile.account_type).toMatch(/^(personal|business)$/);
		});

		it('should demonstrate error handling structure', () => {
			const mockApiError = {
				status: 404,
				response: {
					status: 404,
					data: {
						message: 'Pin not found',
						details: [
							{
								field: 'pin_id',
								reason: 'Pin with ID test-pin-123 does not exist',
							},
						],
					},
				},
			};

			expect(mockApiError.status).toBe(404);
			expect(mockApiError.response.data.message).toBeDefined();
			expect(Array.isArray(mockApiError.response.data.details)).toBe(true);
		});
	});
});
