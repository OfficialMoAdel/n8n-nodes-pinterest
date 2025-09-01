import { BatchProcessor, CancellationToken } from '../BatchProcessor';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { PinterestApiClient } from '../PinterestApiClient';

/**
 * Performance tests for BatchProcessor
 * Tests batch operations under various loads and conditions
 */

// Mock implementations for testing
const mockExecuteFunctions = {
	getNode: () => ({ name: 'Pinterest Test Node' }),
	getNodeParameter: (name: string, index: number, defaultValue?: any) => defaultValue,
	continueOnFail: () => false,
} as unknown as IExecuteFunctions;

const mockApiClient = {
	getPin: jest.fn(),
	updatePin: jest.fn(),
	deletePin: jest.fn(),
	getBoard: jest.fn(),
	updateBoard: jest.fn(),
	deleteBoard: jest.fn(),
} as unknown as PinterestApiClient;

describe('BatchProcessor Performance Tests', () => {
	let batchProcessor: BatchProcessor;

	beforeEach(() => {
		batchProcessor = new BatchProcessor(mockExecuteFunctions, mockApiClient);
		jest.clearAllMocks();
	});

	afterEach(() => {
		batchProcessor.clearCache();
	});

	describe('Small Batch Performance (1-10 items)', () => {
		it('should process small batches efficiently', async () => {
			const items = Array.from({ length: 5 }, (_, i) => `pin_${i}`);
			const startTime = Date.now();

			// Mock successful responses
			(mockApiClient.getPin as jest.Mock).mockResolvedValue({
				id: 'test_pin',
				title: 'Test Pin',
				description: 'Test Description',
			});

			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 10,
				maxConcurrency: 3,
				enableOptimization: true,
				retryAttempts: 1,
				retryDelay: 100,
			});

			const duration = Date.now() - startTime;

			expect(result.success).toHaveLength(5);
			expect(result.errors).toHaveLength(0);
			expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
			expect(mockApiClient.getPin).toHaveBeenCalledTimes(5);
		});

		it('should handle concurrent processing efficiently', async () => {
			const items = Array.from({ length: 10 }, (_, i) => `pin_${i}`);
			const callTimes: number[] = [];

			// Mock with timing tracking
			(mockApiClient.getPin as jest.Mock).mockImplementation(async () => {
				callTimes.push(Date.now());
				await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate API delay
				return { id: 'test_pin', title: 'Test Pin' };
			});

			const startTime = Date.now();
			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 10,
				maxConcurrency: 5,
				enableOptimization: true,
			});

			const duration = Date.now() - startTime;

			expect(result.success).toHaveLength(10);
			expect(duration).toBeLessThan(1000); // Should be faster than sequential processing

			// Verify concurrent execution (calls should overlap in time)
			const firstCallTime = callTimes[0];
			const concurrentCalls = callTimes.filter((time) => time - firstCallTime < 50).length;
			expect(concurrentCalls).toBeGreaterThan(1);
		});
	});

	describe('Medium Batch Performance (50-100 items)', () => {
		it('should process medium batches with proper batching', async () => {
			const items = Array.from({ length: 75 }, (_, i) => `pin_${i}`);
			const startTime = Date.now();

			// Mock successful responses
			(mockApiClient.getPin as jest.Mock).mockResolvedValue({
				id: 'test_pin',
				title: 'Test Pin',
			});

			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 25,
				maxConcurrency: 5,
				enableOptimization: true,
				retryAttempts: 2,
				retryDelay: 200,
			});

			const duration = Date.now() - startTime;

			expect(result.success).toHaveLength(75);
			expect(result.errors).toHaveLength(0);
			expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
			expect(mockApiClient.getPin).toHaveBeenCalledTimes(75);
			expect(result.progress.totalBatches).toBe(3); // 75 items / 25 batch size = 3 batches
		});

		it('should handle mixed success/failure scenarios', async () => {
			const items = Array.from({ length: 50 }, (_, i) => `pin_${i}`);
			let callCount = 0;

			// Mock with 20% failure rate
			(mockApiClient.getPin as jest.Mock).mockImplementation(async () => {
				callCount++;
				if (callCount % 5 === 0) {
					throw new Error('Simulated API error');
				}
				return { id: 'test_pin', title: 'Test Pin' };
			});

			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 20,
				maxConcurrency: 3,
				enableOptimization: true,
				retryAttempts: 1,
				retryDelay: 100,
			});

			expect(result.success.length).toBe(40); // 80% success rate
			expect(result.errors.length).toBe(10); // 20% failure rate
			expect(result.progress.total).toBe(50);
		});
	});

	describe('Large Batch Performance (100+ items)', () => {
		it('should process large batches efficiently with optimization', async () => {
			const items = Array.from({ length: 200 }, (_, i) => `pin_${i % 50}`); // Introduce duplicates
			const startTime = Date.now();

			// Mock successful responses
			(mockApiClient.getPin as jest.Mock).mockResolvedValue({
				id: 'test_pin',
				title: 'Test Pin',
			});

			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 50,
				maxConcurrency: 5,
				enableOptimization: true,
				retryAttempts: 2,
				retryDelay: 300,
			});

			const duration = Date.now() - startTime;

			expect(result.success.length).toBeGreaterThan(0);
			expect(result.optimizations.duplicatesRemoved).toBeGreaterThan(0);
			expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
		});

		it('should respect rate limits and queue requests appropriately', async () => {
			const items = Array.from({ length: 100 }, (_, i) => `pin_${i}`);
			const callTimes: number[] = [];

			// Mock with rate limiting simulation
			(mockApiClient.getPin as jest.Mock).mockImplementation(async () => {
				callTimes.push(Date.now());
				await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate API delay
				return { id: 'test_pin', title: 'Test Pin' };
			});

			const startTime = Date.now();
			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 25,
				maxConcurrency: 3, // Limited concurrency
				enableOptimization: true,
				retryAttempts: 1,
				retryDelay: 100,
			});

			const duration = Date.now() - startTime;

			expect(result.success).toHaveLength(100);
			expect(result.progress.totalBatches).toBe(4); // 100 items / 25 batch size = 4 batches

			// Verify that requests were properly spaced (not all at once)
			const maxConcurrentCalls = Math.max(
				...callTimes.map((time, index) => {
					return callTimes.filter((t) => Math.abs(t - time) < 100).length;
				}),
			);
			expect(maxConcurrentCalls).toBeLessThanOrEqual(3);
		});
	});

	describe('Error Handling Performance', () => {
		it('should handle high error rates efficiently', async () => {
			const items = Array.from({ length: 50 }, (_, i) => `pin_${i}`);
			let callCount = 0;

			// Mock with 50% failure rate
			(mockApiClient.getPin as jest.Mock).mockImplementation(async () => {
				callCount++;
				if (callCount % 2 === 0) {
					throw new Error('Simulated API error');
				}
				return { id: 'test_pin', title: 'Test Pin' };
			});

			const startTime = Date.now();
			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 20,
				maxConcurrency: 3,
				enableOptimization: true,
				retryAttempts: 2,
				retryDelay: 100,
			});

			const duration = Date.now() - startTime;

			expect(result.success.length).toBe(25); // 50% success rate
			expect(result.errors.length).toBe(25); // 50% failure rate
			expect(duration).toBeLessThan(15000); // Should handle errors efficiently
		});

		it('should handle retry logic efficiently', async () => {
			const items = Array.from({ length: 20 }, (_, i) => `pin_${i}`);
			let callCount = 0;

			// Mock with failures that succeed on retry
			(mockApiClient.getPin as jest.Mock).mockImplementation(async () => {
				callCount++;
				if (callCount <= 10) {
					throw new Error('Temporary API error');
				}
				return { id: 'test_pin', title: 'Test Pin' };
			});

			const startTime = Date.now();
			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 10,
				maxConcurrency: 2,
				enableOptimization: true,
				retryAttempts: 3,
				retryDelay: 100,
			});

			const duration = Date.now() - startTime;

			expect(result.success.length).toBeGreaterThan(10); // Some should succeed on retry
			expect(callCount).toBeGreaterThan(20); // Should have retry attempts
			expect(duration).toBeLessThan(10000); // Should handle retries efficiently
		});
	});

	describe('Cancellation Performance', () => {
		it('should cancel operations quickly', async () => {
			const items = Array.from({ length: 100 }, (_, i) => `pin_${i}`);
			const cancellationToken = new CancellationToken();

			// Mock with delay to allow cancellation
			(mockApiClient.getPin as jest.Mock).mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return { id: 'test_pin', title: 'Test Pin' };
			});

			// Cancel after 500ms
			setTimeout(() => {
				cancellationToken.cancel('Test cancellation');
			}, 500);

			const startTime = Date.now();

			await expect(
				batchProcessor.processPinBatch(
					items,
					'get',
					undefined,
					{
						maxBatchSize: 20,
						maxConcurrency: 5,
						enableOptimization: true,
					},
					cancellationToken,
				),
			).rejects.toThrow('cancelled');

			const duration = Date.now() - startTime;
			expect(duration).toBeLessThan(1000); // Should cancel quickly
		});
	});

	describe('Memory Usage Performance', () => {
		it('should manage memory efficiently for large batches', async () => {
			const items = Array.from({ length: 500 }, (_, i) => `pin_${i}`);

			// Mock successful responses
			(mockApiClient.getPin as jest.Mock).mockResolvedValue({
				id: 'test_pin',
				title: 'Test Pin',
				description: 'A'.repeat(1000), // Large description to test memory
			});

			const initialMemory = process.memoryUsage().heapUsed;

			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 50,
				maxConcurrency: 5,
				enableOptimization: true,
				retryAttempts: 1,
				retryDelay: 50,
			});

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;

			expect(result.success).toHaveLength(500);
			expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Should not increase by more than 50MB
		});
	});

	describe('Cache Performance', () => {
		it('should improve performance with caching enabled', async () => {
			const items = Array.from({ length: 50 }, (_, i) => `pin_${i % 10}`); // Many duplicates

			// Mock successful responses
			(mockApiClient.getPin as jest.Mock).mockResolvedValue({
				id: 'test_pin',
				title: 'Test Pin',
			});

			const startTime = Date.now();
			const result = await batchProcessor.processPinBatch(items, 'get', undefined, {
				maxBatchSize: 25,
				maxConcurrency: 5,
				enableOptimization: true,
				retryAttempts: 1,
				retryDelay: 50,
			});

			const duration = Date.now() - startTime;

			expect(result.success.length).toBeGreaterThan(0);
			expect(result.optimizations.duplicatesRemoved).toBeGreaterThan(0);
			expect(mockApiClient.getPin).toHaveBeenCalledTimes(10); // Should only call unique items
			expect(duration).toBeLessThan(5000); // Should be faster due to optimization
		});
	});

	describe('Progress Tracking Performance', () => {
		it('should track progress without significant overhead', async () => {
			const items = Array.from({ length: 100 }, (_, i) => `pin_${i}`);
			const progressUpdates: any[] = [];

			// Mock successful responses
			(mockApiClient.getPin as jest.Mock).mockResolvedValue({
				id: 'test_pin',
				title: 'Test Pin',
			});

			const startTime = Date.now();
			const result = await batchProcessor.processBatch(
				items,
				async (item) => await mockApiClient.getPin(item),
				{
					maxBatchSize: 20,
					maxConcurrency: 5,
					enableOptimization: true,
					progressCallback: (progress) => {
						progressUpdates.push({ ...progress });
					},
				},
			);

			const duration = Date.now() - startTime;

			expect(result.success).toHaveLength(100);
			expect(progressUpdates.length).toBeGreaterThan(0);
			expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
			expect(duration).toBeLessThan(10000); // Progress tracking shouldn't add significant overhead
		});
	});
});
