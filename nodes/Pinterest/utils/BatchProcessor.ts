import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from './PinterestApiClient';

/**
 * Batch operation configuration
 */
export interface BatchConfig {
	maxBatchSize: number;
	maxConcurrency: number;
	progressCallback?: (progress: BatchProgress) => void;
	retryAttempts: number;
	retryDelay: number;
	enableOptimization: boolean;
}

/**
 * Batch operation progress tracking
 */
export interface BatchProgress {
	total: number;
	completed: number;
	failed: number;
	percentage: number;
	currentBatch: number;
	totalBatches: number;
	estimatedTimeRemaining?: number;
	startTime: number;
	errors: BatchError[];
}

/**
 * Batch operation error
 */
export interface BatchError {
	itemId: string;
	error: string;
	attempt: number;
	timestamp: number;
}

/**
 * Batch operation result
 */
export interface BatchResult<T = any> {
	success: T[];
	errors: BatchError[];
	progress: BatchProgress;
	optimizations: BatchOptimizations;
}

/**
 * Batch optimizations applied
 */
export interface BatchOptimizations {
	duplicatesRemoved: number;
	requestsOptimized: number;
	cacheHits: number;
	totalSavings: number;
}

/**
 * Cancellation token for batch operations
 */
export class CancellationToken {
	private _cancelled = false;
	private _reason?: string;

	get isCancelled(): boolean {
		return this._cancelled;
	}

	get reason(): string | undefined {
		return this._reason;
	}

	cancel(reason?: string): void {
		this._cancelled = true;
		this._reason = reason;
	}

	throwIfCancelled(): void {
		if (this._cancelled) {
			throw new Error(`Operation cancelled: ${this._reason || 'Unknown reason'}`);
		}
	}
}

/**
 * Enhanced batch processor with optimization and progress tracking
 */
export class BatchProcessor {
	private readonly defaultConfig: BatchConfig = {
		maxBatchSize: 50,
		maxConcurrency: 5,
		retryAttempts: 3,
		retryDelay: 1000,
		enableOptimization: true,
	};

	private cache = new Map<string, any>();
	private duplicateTracker = new Set<string>();

	constructor(
		private executeFunctions: IExecuteFunctions,
		private apiClient: PinterestApiClient,
	) {}

	/**
	 * Process batch operation with optimization and progress tracking
	 */
	async processBatch<TInput, TOutput>(
		items: TInput[],
		processor: (item: TInput, index: number) => Promise<TOutput>,
		config: Partial<BatchConfig> = {},
		cancellationToken?: CancellationToken,
	): Promise<BatchResult<TOutput>> {
		const finalConfig = { ...this.defaultConfig, ...config };
		const startTime = Date.now();

		// Initialize progress tracking
		const progress: BatchProgress = {
			total: items.length,
			completed: 0,
			failed: 0,
			percentage: 0,
			currentBatch: 0,
			totalBatches: Math.ceil(items.length / finalConfig.maxBatchSize),
			startTime,
			errors: [],
		};

		// Initialize optimizations tracking
		const optimizations: BatchOptimizations = {
			duplicatesRemoved: 0,
			requestsOptimized: 0,
			cacheHits: 0,
			totalSavings: 0,
		};

		// Apply optimizations if enabled
		let optimizedItems = items;
		if (finalConfig.enableOptimization) {
			optimizedItems = this.optimizeItems(items, optimizations);
		}

		const results: TOutput[] = [];
		const errors: BatchError[] = [];

		// Process items in batches
		const batches = this.createBatches(optimizedItems, finalConfig.maxBatchSize);

		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			cancellationToken?.throwIfCancelled();

			progress.currentBatch = batchIndex + 1;
			this.updateProgress(progress, finalConfig.progressCallback);

			const batch = batches[batchIndex];
			const batchResults = await this.processBatchConcurrently(
				batch,
				processor,
				finalConfig,
				cancellationToken,
			);

			// Collect results and errors
			for (const result of batchResults) {
				if (result.success && result.data !== undefined) {
					results.push(result.data);
					progress.completed++;
				} else {
					errors.push(result.error!);
					progress.failed++;
				}
			}

			// Update progress
			progress.percentage = Math.round(
				((progress.completed + progress.failed) / progress.total) * 100,
			);
			progress.estimatedTimeRemaining = this.calculateETA(progress, startTime);
			progress.errors = errors;

			this.updateProgress(progress, finalConfig.progressCallback);

			// Add delay between batches to respect rate limits
			if (batchIndex < batches.length - 1) {
				await this.sleep(100);
			}
		}

		return {
			success: results,
			errors,
			progress,
			optimizations,
		};
	}

	/**
	 * Process batch of pins with intelligent optimization
	 */
	async processPinBatch(
		pinIds: string[],
		operation: 'get' | 'update' | 'delete',
		operationData?: any,
		config: Partial<BatchConfig> = {},
		cancellationToken?: CancellationToken,
	): Promise<BatchResult> {
		const processor = async (pinId: string, index: number) => {
			switch (operation) {
				case 'get':
					return await this.getWithCache(pinId);
				case 'update':
					return await this.apiClient.updatePin(pinId, operationData);
				case 'delete':
					await this.apiClient.deletePin(pinId);
					return { deleted: true, pinId };
				default:
					throw new Error(`Unsupported pin operation: ${operation}`);
			}
		};

		return await this.processBatch(pinIds, processor, config, cancellationToken);
	}

	/**
	 * Process batch of boards with intelligent optimization
	 */
	async processBoardBatch(
		boardIds: string[],
		operation: 'get' | 'update' | 'delete',
		operationData?: any,
		config: Partial<BatchConfig> = {},
		cancellationToken?: CancellationToken,
	): Promise<BatchResult> {
		const processor = async (boardId: string, index: number) => {
			switch (operation) {
				case 'get':
					return await this.getBoardWithCache(boardId);
				case 'update':
					return await this.apiClient.updateBoard(boardId, operationData);
				case 'delete':
					await this.apiClient.deleteBoard(boardId);
					return { deleted: true, boardId };
				default:
					throw new Error(`Unsupported board operation: ${operation}`);
			}
		};

		return await this.processBatch(boardIds, processor, config, cancellationToken);
	}

	/**
	 * Optimize items by removing duplicates and applying caching
	 */
	private optimizeItems<T>(items: T[], optimizations: BatchOptimizations): T[] {
		const originalLength = items.length;

		// Remove duplicates
		const uniqueItems = Array.from(new Set(items.map((item) => JSON.stringify(item)))).map((item) =>
			JSON.parse(item),
		);

		optimizations.duplicatesRemoved = originalLength - uniqueItems.length;
		optimizations.totalSavings += optimizations.duplicatesRemoved;

		return uniqueItems;
	}

	/**
	 * Create batches from items array
	 */
	private createBatches<T>(items: T[], batchSize: number): T[][] {
		const batches: T[][] = [];
		for (let i = 0; i < items.length; i += batchSize) {
			batches.push(items.slice(i, i + batchSize));
		}
		return batches;
	}

	/**
	 * Process batch items concurrently with controlled concurrency
	 */
	private async processBatchConcurrently<TInput, TOutput>(
		batch: TInput[],
		processor: (item: TInput, index: number) => Promise<TOutput>,
		config: BatchConfig,
		cancellationToken?: CancellationToken,
	): Promise<Array<{ success: boolean; data?: TOutput; error?: BatchError }>> {
		const semaphore = new Semaphore(config.maxConcurrency);
		const promises = batch.map(async (item, index) => {
			return await semaphore.acquire(async () => {
				cancellationToken?.throwIfCancelled();

				return await this.processWithRetry(
					() => processor(item, index),
					config.retryAttempts,
					config.retryDelay,
					String(item),
				);
			});
		});

		return await Promise.all(promises);
	}

	/**
	 * Process single item with retry logic
	 */
	private async processWithRetry<T>(
		processor: () => Promise<T>,
		maxAttempts: number,
		delay: number,
		itemId: string,
	): Promise<{ success: boolean; data?: T; error?: BatchError }> {
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				const result = await processor();
				return { success: true, data: result };
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				if (attempt < maxAttempts) {
					await this.sleep(delay * attempt); // Exponential backoff
				}
			}
		}

		return {
			success: false,
			error: {
				itemId,
				error: lastError?.message || 'Unknown error',
				attempt: maxAttempts,
				timestamp: Date.now(),
			},
		};
	}

	/**
	 * Get pin with caching
	 */
	private async getWithCache(pinId: string): Promise<any> {
		const cacheKey = `pin:${pinId}`;

		if (this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey);
		}

		const result = await this.apiClient.getPin(pinId);
		this.cache.set(cacheKey, result);

		return result;
	}

	/**
	 * Get board with caching
	 */
	private async getBoardWithCache(boardId: string): Promise<any> {
		const cacheKey = `board:${boardId}`;

		if (this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey);
		}

		const result = await this.apiClient.getBoard(boardId);
		this.cache.set(cacheKey, result);

		return result;
	}

	/**
	 * Update progress and call callback if provided
	 */
	private updateProgress(
		progress: BatchProgress,
		callback?: (progress: BatchProgress) => void,
	): void {
		if (callback) {
			callback(progress);
		}
	}

	/**
	 * Calculate estimated time remaining
	 */
	private calculateETA(progress: BatchProgress, startTime: number): number {
		const elapsed = Date.now() - startTime;
		const rate = (progress.completed + progress.failed) / elapsed;
		const remaining = progress.total - (progress.completed + progress.failed);

		return remaining / rate;
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys()),
		};
	}
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
	private permits: number;
	private waiting: Array<() => void> = [];

	constructor(permits: number) {
		this.permits = permits;
	}

	async acquire<T>(task: () => Promise<T>): Promise<T> {
		await this.waitForPermit();
		try {
			return await task();
		} finally {
			this.release();
		}
	}

	private async waitForPermit(): Promise<void> {
		if (this.permits > 0) {
			this.permits--;
			return;
		}

		return new Promise<void>((resolve) => {
			this.waiting.push(resolve);
		});
	}

	private release(): void {
		const next = this.waiting.shift();
		if (next) {
			next();
		} else {
			this.permits++;
		}
	}
}
