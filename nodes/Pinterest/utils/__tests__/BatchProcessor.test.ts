import { BatchProcessor, CancellationToken } from '../BatchProcessor';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { PinterestApiClient } from '../PinterestApiClient';

/**
 * Unit tests for BatchProcessor
 * Tests core functionality, error handling, and edge cases
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

describe('BatchProcessor', () => {
	let batchProcessor: BatchProcessor;

	beforeEach(() => {
		batchProcessor = new BatchProcessor(mockExecuteFunctions, mockApiClient);
		jest.clearAllMocks();
	});

	afterEach(() => {
		batchProcessor.clearCache();
	});

	describe('Constructor', () => {
		it('should initialize with correct dependencies', () => {
			expect(batchProcessor).toBeInstanceOf(BatchProcessor);
		});
	});

	describe('processBatch', () => {
		it('should process items successfully', async () => {
			const items = ['item1', 'item2', 'item3'];
			const processor = jest.fn().mockResolvedValue('processed');

			const result = await batchProcessor.processBatch(items, processor);

			expect(result.success).toHaveLength(3);
			expect(result.errors).toHaveLength(0);
			expect(result.progress.total).toBe(3);
			expect(result.progress.completed).toBe(3);
			expect(result.progress.percentage).toBe(100);
			expect(processor).toHaveBeenCalledTimes(3);
		});

		it('should handle processing errors gracefully', async () => {
			const items = ['item1', 'item2', 'item3'];
			const processor = jest
				.fn()
				.mockResolvedValueOnce('processed1')
				.mockRejectedValueOnce(new Error('Processing error'))
				.mockResolvedValueOnce('processed3');

			const result = await batchProcessor.processBatch(items, processor, {
				retryAttempts: 1,
			});

			expect(result.success).toHaveLength(2);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe('Processing error');
			expect(result.progress.completed).toBe(2);
			expect(result.progress.failed).toBe(1);
		});

		it('should respect batch size configuration', async () => {
			const items = Array.from({ length: 10 }, (_, i) => `item${i}`);
			const processor = jest.fn().mockResolvedValue('processed');

			const result = await batchProcessor.processBatch(items, processor, {
				maxBatchSize: 3,
			});

			expect(result.success).toHaveLength(10);
			expect(result.progress.totalBatches).toBe(4); // 10 items / 3 batch size = 4 batches (rounded up)
		});

		it('should handle empty input array', async () => {
			const items: string[] = [];
			const processor = jest.fn();

			const result = await batchProcessor.processBatch(items, processor);

			expect(result.success).toHaveLength(0);
			expect(result.errors).toHaveLength(0);
			expect(result.progress.total).toBe(0);
			expect(processor).not.toHaveBeenCalled();
		});

		it('should call progress callback when provided', async () => {
			const items = ['item1', 'item2'];
			const processor = jest.fn().mockResolvedValue('processed');
			const progressCallback = jest.fn();

			await batchProcessor.processBatch(items, processor, {
				progressCallback,
			});

			expect(progressCallback).toHaveBeenCalled();
			const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
			expect(lastCall.percentage).toBe(100);
		});
	});

	describe('processPinBatch', () => {
		it('should process pin get operations', async () => {
			const pinIds = ['pin1', 'pin2', 'pin3'];
			(mockApiClient.getPin as jest.Mock).mockResolvedValue({
				id: 'test_pin',
				title: 'Test Pin',
			});

			const result = await batchProcessor.processPinBatch(pinIds, 'get');

			expect(result.success).toHaveLength(3);
			expect(result.errors).toHaveLength(0);
			expect(mockApiClient.getPin).toHaveBeenCalledTimes(3);
		});

		it('should process pin update operations', async () => {
			const pinIds = ['pin1', 'pin2'];
			const updateData = { title: 'Updated Title' };
			(mockApiClient.updatePin as jest.Mock).mockResolvedValue({
				id: 'test_pin',
				title: 'Updated Title',
			});

			const result = await batchProcessor.processPinBatch(pinIds, 'update', updateData);

			expect(result.success).toHaveLength(2);
			expect(mockApiClient.updatePin).toHaveBeenCalledTimes(2);
			expect(mockApiClient.updatePin).toHaveBeenCalledWith('pin1', updateData);
		});

		it('should process pin delete operations', async () => {
			const pinIds = ['pin1', 'pin2'];
			(mockApiClient.deletePin as jest.Mock).mockResolvedValue(undefined);

			const result = await batchProcessor.processPinBatch(pinIds, 'delete');

			expect(result.success).toHaveLength(2);
			expect(mockApiClient.deletePin).toHaveBeenCalledTimes(2);
		});

		it('should throw error for unsupported pin operation', async () => {
			const pinIds = ['pin1'];

			await expect(batchProcessor.processPinBatch(pinIds, 'unsupported' as any)).rejects.toThrow(
				'Unsupported pin operation: unsupported',
			);
		});
	});

	describe('processBoardBatch', () => {
		it('should process board get operations', async () => {
			const boardIds = ['board1', 'board2'];
			(mockApiClient.getBoard as jest.Mock).mockResolvedValue({
				id: 'test_board',
				name: 'Test Board',
			});

			const result = await batchProcessor.processBoardBatch(boardIds, 'get');

			expect(result.success).toHaveLength(2);
			expect(mockApiClient.getBoard).toHaveBeenCalledTimes(2);
		});

		it('should process board update operations', async () => {
			const boardIds = ['board1'];
			const updateData = { name: 'Updated Board' };
			(mockApiClient.updateBoard as jest.Mock).mockResolvedValue({
				id: 'test_board',
				name: 'Updated Board',
			});

			const result = await batchProcessor.processBoardBatch(boardIds, 'update', updateData);

			expect(result.success).toHaveLength(1);
			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board1', updateData);
		});

		it('should throw error for unsupported board operation', async () => {
			const boardIds = ['board1'];

			await expect(
				batchProcessor.processBoardBatch(boardIds, 'unsupported' as any),
			).rejects.toThrow('Unsupported board operation: unsupported');
		});
	});

	describe('Optimization Features', () => {
		it('should remove duplicates when optimization is enabled', async () => {
			const items = ['item1', 'item2', 'item1', 'item3', 'item2']; // Contains duplicates
			const processor = jest.fn().mockResolvedValue('processed');

			const result = await batchProcessor.processBatch(items, processor, {
				enableOptimization: true,
			});

			expect(result.optimizations.duplicatesRemoved).toBe(2); // 2 duplicates removed
			expect(processor).toHaveBeenCalledTimes(3); // Only unique items processed
		});

		it('should not remove duplicates when optimization is disabled', async () => {
			const items = ['item1', 'item2', 'item1'];
			const processor = jest.fn().mockResolvedValue('processed');

			const result = await batchProcessor.processBatch(items, processor, {
				enableOptimization: false,
			});

			expect(result.optimizations.duplicatesRemoved).toBe(0);
			expect(processor).toHaveBeenCalledTimes(3); // All items processed
		});
	});

	describe('Retry Logic', () => {
		it('should retry failed operations', async () => {
			const items = ['item1'];
			const processor = jest
				.fn()
				.mockRejectedValueOnce(new Error('First attempt failed'))
				.mockRejectedValueOnce(new Error('Second attempt failed'))
				.mockResolvedValueOnce('success on third attempt');

			const result = await batchProcessor.processBatch(items, processor, {
				retryAttempts: 3,
				retryDelay: 10, // Short delay for testing
			});

			expect(result.success).toHaveLength(1);
			expect(result.errors).toHaveLength(0);
			expect(processor).toHaveBeenCalledTimes(3);
		});

		it('should fail after max retry attempts', async () => {
			const items = ['item1'];
			const processor = jest.fn().mockRejectedValue(new Error('Always fails'));

			const result = await batchProcessor.processBatch(items, processor, {
				retryAttempts: 2,
				retryDelay: 10,
			});

			expect(result.success).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].attempt).toBe(2);
			expect(processor).toHaveBeenCalledTimes(2);
		});
	});

	describe('Concurrency Control', () => {
		it('should respect max concurrency setting', async () => {
			const items = Array.from({ length: 10 }, (_, i) => `item${i}`);
			let activeCalls = 0;
			let maxConcurrentCalls = 0;

			const processor = jest.fn().mockImplementation(async () => {
				activeCalls++;
				maxConcurrentCalls = Math.max(maxConcurrentCalls, activeCalls);
				await new Promise((resolve) => setTimeout(resolve, 50));
				activeCalls--;
				return 'processed';
			});

			await batchProcessor.processBatch(items, processor, {
				maxConcurrency: 3,
			});

			expect(maxConcurrentCalls).toBeLessThanOrEqual(3);
		});
	});

	describe('Caching', () => {
		it('should cache pin results', async () => {
			const pinIds = ['pin1', 'pin1', 'pin2']; // pin1 appears twice
			(mockApiClient.getPin as jest.Mock).mockResolvedValue({
				id: 'test_pin',
				title: 'Test Pin',
			});

			// First call should populate cache
			await batchProcessor.processPinBatch(['pin1'], 'get');
			expect(mockApiClient.getPin).toHaveBeenCalledTimes(1);

			// Second call should use cache
			await batchProcessor.processPinBatch(['pin1'], 'get');
			expect(mockApiClient.getPin).toHaveBeenCalledTimes(1); // No additional calls
		});

		it('should provide cache statistics', () => {
			const stats = batchProcessor.getCacheStats();
			expect(stats).toHaveProperty('size');
			expect(stats).toHaveProperty('keys');
			expect(Array.isArray(stats.keys)).toBe(true);
		});

		it('should clear cache', async () => {
			// Populate cache
			(mockApiClient.getPin as jest.Mock).mockResolvedValue({ id: 'test' });
			await batchProcessor.processPinBatch(['pin1'], 'get');

			let stats = batchProcessor.getCacheStats();
			expect(stats.size).toBeGreaterThan(0);

			// Clear cache
			batchProcessor.clearCache();
			stats = batchProcessor.getCacheStats();
			expect(stats.size).toBe(0);
		});
	});

	describe('CancellationToken', () => {
		it('should create cancellation token', () => {
			const token = new CancellationToken();
			expect(token.isCancelled).toBe(false);
			expect(token.reason).toBeUndefined();
		});

		it('should cancel token with reason', () => {
			const token = new CancellationToken();
			token.cancel('Test cancellation');

			expect(token.isCancelled).toBe(true);
			expect(token.reason).toBe('Test cancellation');
		});

		it('should throw when cancelled', () => {
			const token = new CancellationToken();
			token.cancel('Test cancellation');

			expect(() => token.throwIfCancelled()).toThrow('Operation cancelled: Test cancellation');
		});

		it('should cancel batch processing', async () => {
			const items = Array.from({ length: 10 }, (_, i) => `item${i}`);
			const processor = jest.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return 'processed';
			});
			const cancellationToken = new CancellationToken();

			// Cancel after 50ms
			setTimeout(() => cancellationToken.cancel('Test cancellation'), 50);

			await expect(
				batchProcessor.processBatch(items, processor, {}, cancellationToken),
			).rejects.toThrow('Operation cancelled: Test cancellation');
		});
	});

	describe('Progress Tracking', () => {
		it('should track progress correctly', async () => {
			const items = ['item1', 'item2', 'item3', 'item4'];
			const processor = jest.fn().mockResolvedValue('processed');
			const progressUpdates: any[] = [];

			await batchProcessor.processBatch(items, processor, {
				maxBatchSize: 2,
				progressCallback: (progress) => {
					progressUpdates.push({ ...progress });
				},
			});

			expect(progressUpdates.length).toBeGreaterThan(0);

			// Check final progress
			const finalProgress = progressUpdates[progressUpdates.length - 1];
			expect(finalProgress.total).toBe(4);
			expect(finalProgress.completed).toBe(4);
			expect(finalProgress.percentage).toBe(100);
			expect(finalProgress.totalBatches).toBe(2);
		});

		it('should calculate estimated time remaining', async () => {
			const items = ['item1', 'item2', 'item3'];
			const processor = jest.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return 'processed';
			});
			const progressUpdates: any[] = [];

			await batchProcessor.processBatch(items, processor, {
				maxBatchSize: 1,
				progressCallback: (progress) => {
					progressUpdates.push({ ...progress });
				},
			});

			// Should have ETA calculations in intermediate progress updates
			const intermediateProgress = progressUpdates.find(
				(p) => p.percentage > 0 && p.percentage < 100,
			);
			if (intermediateProgress) {
				expect(intermediateProgress.estimatedTimeRemaining).toBeGreaterThan(0);
			}
		});
	});

	describe('Error Scenarios', () => {
		it('should handle processor throwing non-Error objects', async () => {
			const items = ['item1'];
			const processor = jest.fn().mockRejectedValue('String error');

			const result = await batchProcessor.processBatch(items, processor, {
				retryAttempts: 1,
			});

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe('String error');
		});

		it('should handle processor returning undefined', async () => {
			const items = ['item1'];
			const processor = jest.fn().mockResolvedValue(undefined);

			const result = await batchProcessor.processBatch(items, processor);

			expect(result.success).toHaveLength(1);
			expect(result.success[0]).toBeUndefined();
		});
	});
});
