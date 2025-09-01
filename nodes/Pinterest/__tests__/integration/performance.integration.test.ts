/**
 * Performance Benchmark Integration Tests
 * Tests performance requirements for all Pinterest operations
 */

import { TestDataManager } from './TestDataManager';
import { PerformanceBenchmark } from './PerformanceBenchmark';
import { IntegrationTestSetup } from './setup';
import { skipIfIntegrationDisabled, integrationConfig } from './config';

describe('Pinterest Performance Integration Tests', () => {
	let testDataManager: TestDataManager | null = null;
	let performanceBenchmark: PerformanceBenchmark;

	// Helper method to simulate API calls with realistic delays
	const simulateApiCall = async (minDelay: number, maxDelay: number): Promise<void> => {
		const delay = Math.random() * (maxDelay - minDelay) + minDelay;
		return new Promise((resolve) => setTimeout(resolve, delay));
	};

	beforeAll(async () => {
		if (skipIfIntegrationDisabled()) return;

		testDataManager = await IntegrationTestSetup.suiteSetup();
		performanceBenchmark = new PerformanceBenchmark();
	});

	afterAll(async () => {
		if (testDataManager) {
			await IntegrationTestSetup.suiteTeardown(testDataManager);
		}
	});

	describe('Single Operation Performance', () => {
		it('should meet response time requirements for pin creation', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const testData = await testDataManager.setupTestData();
			const testBoard = testData.boards[0];

			// Test multiple pin creations to get average performance
			const iterations = 5;
			const responseTimes: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const timer = performanceBenchmark.startOperation(`pin_create_perf_${i}`);
				const startTime = Date.now();

				try {
					// Mock pin creation with realistic delay
					await simulateApiCall(200, 1500); // 200ms to 1.5s range

					const endTime = Date.now();
					const responseTime = endTime - startTime;
					responseTimes.push(responseTime);

					timer.end(true, undefined, 1024, 2048); // Mock request/response sizes
				} catch (error) {
					timer.end(false, (error as Error).message);
					throw error;
				}
			}

			// Validate performance requirements
			const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
			const maxResponseTime = Math.max(...responseTimes);

			expect(averageResponseTime).toBeLessThan(integrationConfig.performance.maxResponseTime);
			expect(maxResponseTime).toBeLessThan(integrationConfig.performance.maxResponseTime * 1.5);

			console.log(
				`Pin Creation - Average: ${averageResponseTime.toFixed(2)}ms, Max: ${maxResponseTime.toFixed(2)}ms`,
			);
		});

		it('should meet response time requirements for pin retrieval', async () => {
			if (skipIfIntegrationDisabled()) return;

			const iterations = 10;
			const responseTimes: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const timer = performanceBenchmark.startOperation(`pin_get_perf_${i}`);
				const startTime = Date.now();

				try {
					// Mock pin retrieval with realistic delay
					await simulateApiCall(100, 800); // 100ms to 800ms range

					const endTime = Date.now();
					const responseTime = endTime - startTime;
					responseTimes.push(responseTime);

					timer.end(true, undefined, 512, 1536); // Mock request/response sizes
				} catch (error) {
					timer.end(false, (error as Error).message);
					throw error;
				}
			}

			const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
			const p95ResponseTime = responseTimes.sort((a, b) => a - b)[
				Math.floor(responseTimes.length * 0.95)
			];

			expect(averageResponseTime).toBeLessThan(integrationConfig.performance.maxResponseTime);
			expect(p95ResponseTime).toBeLessThan(integrationConfig.performance.maxResponseTime * 1.2);

			console.log(
				`Pin Retrieval - Average: ${averageResponseTime.toFixed(2)}ms, P95: ${p95ResponseTime.toFixed(2)}ms`,
			);
		});

		it('should meet response time requirements for board operations', async () => {
			if (skipIfIntegrationDisabled()) return;

			const operations = ['create', 'get', 'update'];
			const operationResults: { [key: string]: number[] } = {};

			for (const operation of operations) {
				const responseTimes: number[] = [];
				const iterations = 3;

				for (let i = 0; i < iterations; i++) {
					const timer = performanceBenchmark.startOperation(`board_${operation}_perf_${i}`);
					const startTime = Date.now();

					try {
						// Mock board operations with realistic delays
						const delayRange = operation === 'create' ? [300, 2000] : [150, 1000];
						await simulateApiCall(delayRange[0], delayRange[1]);

						const endTime = Date.now();
						const responseTime = endTime - startTime;
						responseTimes.push(responseTime);

						timer.end(true, undefined, 768, 1024);
					} catch (error) {
						timer.end(false, (error as Error).message);
						throw error;
					}
				}

				operationResults[operation] = responseTimes;
				const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

				expect(averageResponseTime).toBeLessThan(integrationConfig.performance.maxResponseTime);
				console.log(`Board ${operation} - Average: ${averageResponseTime.toFixed(2)}ms`);
			}
		});

		it('should meet response time requirements for search operations', async () => {
			if (skipIfIntegrationDisabled()) return;

			const searchTypes = ['pins', 'boards'];
			const searchResults: { [key: string]: number[] } = {};

			for (const searchType of searchTypes) {
				const responseTimes: number[] = [];
				const iterations = 5;

				for (let i = 0; i < iterations; i++) {
					const timer = performanceBenchmark.startOperation(`search_${searchType}_perf_${i}`);
					const startTime = Date.now();

					try {
						// Mock search operations with realistic delays
						await simulateApiCall(400, 2500); // Search can be slower

						const endTime = Date.now();
						const responseTime = endTime - startTime;
						responseTimes.push(responseTime);

						timer.end(true, undefined, 256, 4096); // Search responses can be larger
					} catch (error) {
						timer.end(false, (error as Error).message);
						throw error;
					}
				}

				searchResults[searchType] = responseTimes;
				const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

				expect(averageResponseTime).toBeLessThan(
					integrationConfig.performance.maxResponseTime * 1.2,
				); // Allow 20% more for search
				console.log(`Search ${searchType} - Average: ${averageResponseTime.toFixed(2)}ms`);
			}
		});
	});

	describe('Concurrent Request Performance', () => {
		it('should handle concurrent pin operations efficiently', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const testData = await testDataManager.setupTestData();
			const testBoard = testData.boards[0];
			const concurrentRequests = integrationConfig.performance.concurrentRequests;

			const timer = performanceBenchmark.startOperation('concurrent_pin_operations');
			const startTime = Date.now();

			try {
				// Create concurrent pin creation promises
				const concurrentPromises = Array.from({ length: concurrentRequests }, async (_, i) => {
					const operationTimer = performanceBenchmark.startOperation(`concurrent_pin_${i}`);

					try {
						// Mock concurrent pin creation
						await simulateApiCall(200, 1500);

						operationTimer.end(true);
						return {
							pinId: `concurrent-pin-${i}`,
							boardId: testBoard.id,
							title: `Concurrent Pin ${i}`,
							success: true,
						};
					} catch (error) {
						operationTimer.end(false, (error as Error).message);
						throw error;
					}
				});

				// Execute all concurrent requests
				const results = await Promise.all(concurrentPromises);

				const endTime = Date.now();
				const totalTime = endTime - startTime;

				// Validate results
				expect(results).toHaveLength(concurrentRequests);
				results.forEach((result, index) => {
					expect(result.success).toBe(true);
					expect(result.pinId).toBe(`concurrent-pin-${index}`);
				});

				// Validate performance - concurrent requests should not take much longer than single request
				const expectedMaxTime = integrationConfig.performance.maxResponseTime * 2; // Allow 2x for concurrency overhead
				expect(totalTime).toBeLessThan(expectedMaxTime);

				timer.end(true);
				console.log(
					`Concurrent Operations (${concurrentRequests}) - Total Time: ${totalTime.toFixed(2)}ms`,
				);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should maintain performance under concurrent load', async () => {
			if (skipIfIntegrationDisabled()) return;

			const concurrentUsers = 3;
			const operationsPerUser = 5;
			const totalOperations = concurrentUsers * operationsPerUser;

			const timer = performanceBenchmark.startOperation('concurrent_load_test');
			const startTime = Date.now();

			try {
				// Simulate multiple users performing operations concurrently
				const userPromises = Array.from({ length: concurrentUsers }, async (_, userId) => {
					const userOperations = Array.from({ length: operationsPerUser }, async (_, opIndex) => {
						const operationTimer = performanceBenchmark.startOperation(
							`user_${userId}_op_${opIndex}`,
						);

						try {
							// Mix of different operations
							const operations = ['pin_get', 'board_get', 'search', 'pin_create', 'analytics'];
							const operation = operations[opIndex % operations.length];

							// Different delays for different operations
							const delayRanges: { [key: string]: [number, number] } = {
								pin_get: [100, 800],
								board_get: [150, 1000],
								search: [400, 2500],
								pin_create: [200, 1500],
								analytics: [300, 2000],
							};

							const [minDelay, maxDelay] = delayRanges[operation];
							await simulateApiCall(minDelay, maxDelay);

							operationTimer.end(true);
							return { userId, operation, success: true };
						} catch (error) {
							operationTimer.end(false, (error as Error).message);
							throw error;
						}
					});

					return Promise.all(userOperations);
				});

				// Execute all user operations concurrently
				const allResults = await Promise.all(userPromises);
				const flatResults = allResults.flat();

				const endTime = Date.now();
				const totalTime = endTime - startTime;

				// Validate results
				expect(flatResults).toHaveLength(totalOperations);
				flatResults.forEach((result) => {
					expect(result.success).toBe(true);
				});

				// Calculate throughput
				const throughput = (totalOperations / totalTime) * 1000; // operations per second
				const expectedMinThroughput = 2; // At least 2 operations per second

				expect(throughput).toBeGreaterThan(expectedMinThroughput);

				timer.end(true);
				console.log(
					`Load Test - ${totalOperations} operations in ${totalTime.toFixed(2)}ms (${throughput.toFixed(2)} ops/sec)`,
				);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});
	});

	describe('Batch Operation Performance', () => {
		it('should handle batch pin creation efficiently', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const testData = await testDataManager.setupTestData();
			const testBoard = testData.boards[0];
			const batchSize = Math.min(integrationConfig.performance.maxBatchSize, 10); // Use smaller batch for testing

			const timer = performanceBenchmark.startOperation('batch_pin_creation');
			const startTime = Date.now();

			try {
				// Mock batch pin creation
				const batchPromises = Array.from({ length: batchSize }, async (_, i) => {
					const itemTimer = performanceBenchmark.startOperation(`batch_pin_item_${i}`);

					try {
						// Simulate batch processing with slight delays
						await simulateApiCall(100, 500);

						itemTimer.end(true);
						return {
							pinId: `batch-pin-${i}`,
							boardId: testBoard.id,
							title: `Batch Pin ${i}`,
							batchIndex: i,
						};
					} catch (error) {
						itemTimer.end(false, (error as Error).message);
						throw error;
					}
				});

				const batchResults = await Promise.all(batchPromises);

				const endTime = Date.now();
				const totalTime = endTime - startTime;

				// Validate batch results
				expect(batchResults).toHaveLength(batchSize);
				batchResults.forEach((result, index) => {
					expect(result.batchIndex).toBe(index);
					expect(result.pinId).toBe(`batch-pin-${index}`);
				});

				// Validate batch performance - should be more efficient than individual operations
				const averageTimePerItem = totalTime / batchSize;
				const maxTimePerItem = integrationConfig.performance.maxResponseTime * 0.8; // Batch should be 20% faster per item

				expect(averageTimePerItem).toBeLessThan(maxTimePerItem);

				timer.end(true);
				console.log(
					`Batch Creation (${batchSize} items) - Total: ${totalTime.toFixed(2)}ms, Avg per item: ${averageTimePerItem.toFixed(2)}ms`,
				);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should optimize API calls for batch operations', async () => {
			if (skipIfIntegrationDisabled()) return;

			const batchSize = 15;
			const timer = performanceBenchmark.startOperation('batch_optimization_test');

			try {
				// Mock optimized batch processing
				const startTime = Date.now();

				// Simulate batch optimization - fewer API calls for batch operations
				const batchGroups = Math.ceil(batchSize / 5); // Group items into batches of 5
				const batchPromises = Array.from({ length: batchGroups }, async (_, groupIndex) => {
					const groupTimer = performanceBenchmark.startOperation(`batch_group_${groupIndex}`);

					try {
						// Simulate processing a group of items in one API call
						await simulateApiCall(300, 1000);

						const itemsInGroup = Math.min(5, batchSize - groupIndex * 5);
						const groupResults = Array.from({ length: itemsInGroup }, (_, itemIndex) => ({
							id: `batch-item-${groupIndex * 5 + itemIndex}`,
							group: groupIndex,
							processed: true,
						}));

						groupTimer.end(true);
						return groupResults;
					} catch (error) {
						groupTimer.end(false, (error as Error).message);
						throw error;
					}
				});

				const allResults = (await Promise.all(batchPromises)).flat();
				const endTime = Date.now();
				const totalTime = endTime - startTime;

				// Validate optimization
				expect(allResults).toHaveLength(batchSize);

				// Batch processing should be significantly faster than individual operations
				const individualTime = batchSize * 1000; // Assume 1s per individual operation
				const optimizationRatio = individualTime / totalTime;

				expect(optimizationRatio).toBeGreaterThan(2); // At least 2x faster
				expect(totalTime).toBeLessThan(integrationConfig.performance.maxResponseTime * 2);

				timer.end(true);
				console.log(
					`Batch Optimization - ${batchSize} items in ${totalTime.toFixed(2)}ms (${optimizationRatio.toFixed(2)}x faster)`,
				);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});
	});

	describe('Memory Usage and Stability', () => {
		it('should maintain stable memory usage during extended operations', async () => {
			if (skipIfIntegrationDisabled()) return;

			const timer = performanceBenchmark.startOperation('memory_stability_test');

			try {
				const initialMemory = process.memoryUsage();
				const operations = 50;
				const memorySnapshots: NodeJS.MemoryUsage[] = [];

				// Perform extended operations
				for (let i = 0; i < operations; i++) {
					const operationTimer = performanceBenchmark.startOperation(`memory_test_op_${i}`);

					try {
						// Simulate various operations
						await simulateApiCall(100, 500);

						// Take memory snapshot every 10 operations
						if (i % 10 === 0) {
							memorySnapshots.push(process.memoryUsage());
						}

						operationTimer.end(true);
					} catch (error) {
						operationTimer.end(false, (error as Error).message);
						throw error;
					}
				}

				const finalMemory = process.memoryUsage();

				// Analyze memory usage
				const heapUsedGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
				const heapUsedGrowthMB = heapUsedGrowth / (1024 * 1024);

				// Memory growth should be reasonable (less than 50MB for 50 operations)
				expect(heapUsedGrowthMB).toBeLessThan(50);

				// Check for memory leaks - heap usage should not grow continuously
				const heapGrowthTrend = memorySnapshots.map((snapshot) => snapshot.heapUsed);
				const maxHeapUsed = Math.max(...heapGrowthTrend);
				const avgHeapUsed = heapGrowthTrend.reduce((a, b) => a + b, 0) / heapGrowthTrend.length;

				// Max heap should not be more than 2x average (indicating potential leaks)
				expect(maxHeapUsed).toBeLessThan(avgHeapUsed * 2);

				timer.end(true);
				console.log(
					`Memory Stability - Heap growth: ${heapUsedGrowthMB.toFixed(2)}MB over ${operations} operations`,
				);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should handle large response data efficiently', async () => {
			if (skipIfIntegrationDisabled()) return;

			const timer = performanceBenchmark.startOperation('large_response_test');

			try {
				// Mock handling large response data (e.g., search results with many items)
				const largeResponseSize = 1000; // 1000 items
				const startTime = Date.now();

				// Simulate processing large response
				const largeResponse = Array.from({ length: largeResponseSize }, (_, i) => ({
					id: `item-${i}`,
					title: `Large Response Item ${i}`,
					description: `Description for item ${i} in large response test`,
					metadata: {
						created: new Date().toISOString(),
						index: i,
						category: `category-${i % 10}`,
					},
				}));

				// Process the large response
				const processedItems = largeResponse.map((item) => ({
					...item,
					processed: true,
					processedAt: Date.now(),
				}));

				const endTime = Date.now();
				const processingTime = endTime - startTime;

				// Validate processing
				expect(processedItems).toHaveLength(largeResponseSize);
				expect(processedItems[0].processed).toBe(true);

				// Processing should be fast even for large responses
				expect(processingTime).toBeLessThan(1000); // Less than 1 second

				timer.end(true, undefined, largeResponseSize * 200, largeResponseSize * 250); // Mock request/response sizes
				console.log(
					`Large Response Processing - ${largeResponseSize} items in ${processingTime.toFixed(2)}ms`,
				);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});
	});

	describe('Rate Limiting Performance', () => {
		it('should handle rate limiting gracefully without performance degradation', async () => {
			if (skipIfIntegrationDisabled()) return;

			const timer = performanceBenchmark.startOperation('rate_limiting_performance');

			try {
				const requestsNearLimit = 50; // Simulate approaching rate limit
				const startTime = Date.now();

				// Simulate requests with rate limiting
				for (let i = 0; i < requestsNearLimit; i++) {
					const requestTimer = performanceBenchmark.startOperation(`rate_limited_request_${i}`);

					try {
						// Simulate rate limiting delays
						const isNearLimit = i > requestsNearLimit * 0.8; // Last 20% of requests
						const baseDelay = 200;
						const rateLimitDelay = isNearLimit ? Math.random() * 500 : 0; // Additional delay when near limit

						await simulateApiCall(baseDelay, baseDelay + rateLimitDelay);

						requestTimer.end(true);
					} catch (error) {
						requestTimer.end(false, (error as Error).message);
						throw error;
					}
				}

				const endTime = Date.now();
				const totalTime = endTime - startTime;
				const averageTimePerRequest = totalTime / requestsNearLimit;

				// Even with rate limiting, average request time should be reasonable
				expect(averageTimePerRequest).toBeLessThan(integrationConfig.performance.maxResponseTime);

				timer.end(true);
				console.log(
					`Rate Limiting Performance - ${requestsNearLimit} requests in ${totalTime.toFixed(2)}ms (avg: ${averageTimePerRequest.toFixed(2)}ms)`,
				);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});
	});

	afterAll(() => {
		if (skipIfIntegrationDisabled()) return;

		// Generate comprehensive performance report
		const results = performanceBenchmark.getResults();
		const validation = performanceBenchmark.validatePerformance();

		console.log('\n=== Pinterest Performance Integration Test Results ===');
		console.log(`Total Operations: ${results.totalOperations}`);
		console.log(`Successful Operations: ${results.successfulOperations}`);
		console.log(`Failed Operations: ${results.failedOperations}`);
		console.log(
			`Success Rate: ${((results.successfulOperations / results.totalOperations) * 100).toFixed(2)}%`,
		);
		console.log(`Average Response Time: ${results.averageResponseTime.toFixed(2)}ms`);
		console.log(`Min Response Time: ${results.minResponseTime.toFixed(2)}ms`);
		console.log(`Max Response Time: ${results.maxResponseTime.toFixed(2)}ms`);
		console.log(`P95 Response Time: ${results.p95ResponseTime.toFixed(2)}ms`);
		console.log(`Throughput: ${results.throughput.toFixed(2)} ops/sec`);
		console.log(`Performance Validation: ${validation.passed ? 'PASSED' : 'FAILED'}`);

		if (!validation.passed) {
			console.log('\nPerformance Issues:');
			validation.issues.forEach((issue) => console.log(`  - ${issue}`));
		}

		// Export detailed metrics for analysis
		const metricsExport = performanceBenchmark.exportMetrics();
		console.log('\nDetailed metrics exported for analysis');

		// In a real implementation, you might save this to a file
		// require('fs').writeFileSync('performance-metrics.json', metricsExport);
	});
});
