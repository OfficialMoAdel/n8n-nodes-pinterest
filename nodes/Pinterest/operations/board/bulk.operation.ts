import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type {
	UpdateBoardRequest,
	BatchOperationConfig,
	BatchOperationProgress,
} from '../../utils/types';
import { DataTransformer } from '../../utils/DataTransformer';
import { BatchProcessor, CancellationToken } from '../../utils/BatchProcessor';

/**
 * Enhanced bulk board operations handler with optimization and progress tracking
 * Provides efficient batch processing for multiple boards with intelligent optimization
 */

/**
 * Bulk get boards operation with enhanced batch processing
 * Retrieves multiple boards by their IDs with optimization and progress tracking
 */
export async function bulkGetBoards(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	// Get board IDs from node parameters (comma-separated string or array)
	const boardIdsParam = this.getNodeParameter('boardIds', itemIndex) as string | string[];

	let boardIds: string[];
	if (typeof boardIdsParam === 'string') {
		// Split comma-separated string and trim whitespace
		boardIds = boardIdsParam
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0);
	} else {
		boardIds = boardIdsParam;
	}

	// Validate that we have board IDs
	if (!boardIds || boardIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one board ID is required', {
			itemIndex,
		});
	}

	// Validate board ID formats
	for (const boardId of boardIds) {
		if (!/^[a-zA-Z0-9_-]+$/.test(boardId)) {
			throw new NodeOperationError(this.getNode(), `Invalid board ID format: ${boardId}`, {
				itemIndex,
			});
		}
	}

	// Get batch configuration from node parameters
	const batchConfig: BatchOperationConfig = {
		maxBatchSize: this.getNodeParameter('maxBatchSize', itemIndex, 50) as number,
		maxConcurrency: this.getNodeParameter('maxConcurrency', itemIndex, 5) as number,
		enableProgressTracking: this.getNodeParameter(
			'enableProgressTracking',
			itemIndex,
			true,
		) as boolean,
		enableOptimization: this.getNodeParameter('enableOptimization', itemIndex, true) as boolean,
		retryAttempts: this.getNodeParameter('retryAttempts', itemIndex, 3) as number,
		retryDelay: this.getNodeParameter('retryDelay', itemIndex, 1000) as number,
	};

	// Validate batch size limits
	const maxAllowedBatchSize = 100;
	if (batchConfig.maxBatchSize! > maxAllowedBatchSize) {
		throw new NodeOperationError(
			this.getNode(),
			`Maximum batch size is ${maxAllowedBatchSize}, got ${batchConfig.maxBatchSize}`,
			{
				itemIndex,
			},
		);
	}

	// Initialize batch processor
	const batchProcessor = new BatchProcessor(this, apiClient);
	const cancellationToken = new CancellationToken();

	// Set up progress tracking if enabled
	let progressData: BatchOperationProgress | null = null;
	if (batchConfig.enableProgressTracking) {
		batchConfig.progressCallback = (progress: BatchOperationProgress) => {
			progressData = progress;
			console.log(
				`Bulk get boards progress: ${progress.percentage}% (${progress.completed}/${progress.total})`,
			);
		};
	}

	try {
		// Process batch with optimization
		const batchResult = await batchProcessor.processBoardBatch(
			boardIds,
			'get',
			undefined,
			batchConfig,
			cancellationToken,
		);

		const results: INodeExecutionData[] = [];

		// Transform successful results
		for (const boardResponse of batchResult.success) {
			const transformedData = DataTransformer.transformBoardResponse(boardResponse);
			results.push({
				json: transformedData,
				pairedItem: { item: itemIndex },
			});
		}

		// Add batch operation summary
		const summary = {
			operation: 'bulkGetBoards',
			totalItems: boardIds.length,
			successCount: batchResult.success.length,
			errorCount: batchResult.errors.length,
			duration: Date.now() - batchResult.progress.startTime,
			optimizations: batchResult.optimizations,
			errors: batchResult.errors,
			...(progressData ? { finalProgress: progressData } : {}),
		};

		results.push({
			json: summary,
			pairedItem: { item: itemIndex },
		});

		return results;
	} catch (error) {
		if (error instanceof Error && error.message.includes('cancelled')) {
			throw new NodeOperationError(
				this.getNode(),
				`Bulk operation was cancelled: ${error.message}`,
				{
					itemIndex,
				},
			);
		}
		throw error;
	} finally {
		// Clean up resources
		batchProcessor.clearCache();
	}
}

/**
 * Bulk update boards operation with enhanced batch processing
 * Updates multiple boards with the same data using optimization and progress tracking
 */
export async function bulkUpdateBoards(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	// Get board IDs from node parameters
	const boardIdsParam = this.getNodeParameter('boardIds', itemIndex) as string | string[];

	let boardIds: string[];
	if (typeof boardIdsParam === 'string') {
		boardIds = boardIdsParam
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0);
	} else {
		boardIds = boardIdsParam;
	}

	// Validate that we have board IDs
	if (!boardIds || boardIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one board ID is required', {
			itemIndex,
		});
	}

	// Validate board ID formats
	for (const boardId of boardIds) {
		if (!/^[a-zA-Z0-9_-]+$/.test(boardId)) {
			throw new NodeOperationError(this.getNode(), `Invalid board ID format: ${boardId}`, {
				itemIndex,
			});
		}
	}

	// Get update parameters (same for all boards)
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const description = this.getNodeParameter('description', itemIndex, '') as string;
	const privacy = this.getNodeParameter('privacy', itemIndex, '') as
		| 'public'
		| 'protected'
		| 'secret'
		| '';

	// Build update request object
	const updateData: UpdateBoardRequest = {};

	if (name) updateData.name = name;
	if (description) updateData.description = description;
	if (privacy) {
		if (!['public', 'protected', 'secret'].includes(privacy)) {
			throw new NodeOperationError(
				this.getNode(),
				'Invalid privacy setting. Must be public, protected, or secret',
				{
					itemIndex,
				},
			);
		}
		updateData.privacy = privacy;
	}

	// Check if at least one field is being updated
	if (Object.keys(updateData).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one field must be provided for update (name, description, or privacy)',
			{
				itemIndex,
			},
		);
	}

	// Get batch configuration from node parameters
	const batchConfig: BatchOperationConfig = {
		maxBatchSize: this.getNodeParameter('maxBatchSize', itemIndex, 50) as number,
		maxConcurrency: this.getNodeParameter('maxConcurrency', itemIndex, 3) as number, // Lower concurrency for updates
		enableProgressTracking: this.getNodeParameter(
			'enableProgressTracking',
			itemIndex,
			true,
		) as boolean,
		enableOptimization: this.getNodeParameter('enableOptimization', itemIndex, true) as boolean,
		retryAttempts: this.getNodeParameter('retryAttempts', itemIndex, 3) as number,
		retryDelay: this.getNodeParameter('retryDelay', itemIndex, 1500) as number, // Longer delay for updates
	};

	// Validate batch size limits
	const maxAllowedBatchSize = 100;
	if (batchConfig.maxBatchSize! > maxAllowedBatchSize) {
		throw new NodeOperationError(
			this.getNode(),
			`Maximum batch size is ${maxAllowedBatchSize}, got ${batchConfig.maxBatchSize}`,
			{
				itemIndex,
			},
		);
	}

	// Initialize batch processor
	const batchProcessor = new BatchProcessor(this, apiClient);
	const cancellationToken = new CancellationToken();

	// Set up progress tracking if enabled
	let progressData: BatchOperationProgress | null = null;
	if (batchConfig.enableProgressTracking) {
		batchConfig.progressCallback = (progress: BatchOperationProgress) => {
			progressData = progress;
			console.log(
				`Bulk update boards progress: ${progress.percentage}% (${progress.completed}/${progress.total})`,
			);
		};
	}

	try {
		// Process batch with optimization
		const batchResult = await batchProcessor.processBoardBatch(
			boardIds,
			'update',
			updateData,
			batchConfig,
			cancellationToken,
		);

		const results: INodeExecutionData[] = [];

		// Transform successful results
		for (const boardResponse of batchResult.success) {
			const transformedData = DataTransformer.transformBoardResponse(boardResponse);
			results.push({
				json: transformedData,
				pairedItem: { item: itemIndex },
			});
		}

		// Add batch operation summary
		const summary = {
			operation: 'bulkUpdateBoards',
			totalItems: boardIds.length,
			successCount: batchResult.success.length,
			errorCount: batchResult.errors.length,
			duration: Date.now() - batchResult.progress.startTime,
			updateData,
			optimizations: batchResult.optimizations,
			errors: batchResult.errors,
			...(progressData ? { finalProgress: progressData } : {}),
		};

		results.push({
			json: summary,
			pairedItem: { item: itemIndex },
		});

		return results;
	} catch (error) {
		if (error instanceof Error && error.message.includes('cancelled')) {
			throw new NodeOperationError(
				this.getNode(),
				`Bulk operation was cancelled: ${error.message}`,
				{
					itemIndex,
				},
			);
		}
		throw error;
	} finally {
		// Clean up resources
		batchProcessor.clearCache();
	}
}

/**
 * Bulk delete boards operation with enhanced batch processing
 * Deletes multiple boards efficiently with optimization and progress tracking
 */
export async function bulkDeleteBoards(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	// Get board IDs from node parameters
	const boardIdsParam = this.getNodeParameter('boardIds', itemIndex) as string | string[];

	let boardIds: string[];
	if (typeof boardIdsParam === 'string') {
		boardIds = boardIdsParam
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0);
	} else {
		boardIds = boardIdsParam;
	}

	// Validate that we have board IDs
	if (!boardIds || boardIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one board ID is required', {
			itemIndex,
		});
	}

	// Validate board ID formats
	for (const boardId of boardIds) {
		if (!/^[a-zA-Z0-9_-]+$/.test(boardId)) {
			throw new NodeOperationError(this.getNode(), `Invalid board ID format: ${boardId}`, {
				itemIndex,
			});
		}
	}

	// Get confirmation parameter
	const confirmDelete = this.getNodeParameter('confirmDelete', itemIndex, false) as boolean;

	if (!confirmDelete) {
		throw new NodeOperationError(
			this.getNode(),
			'Bulk board deletion must be confirmed. Please check the "Confirm Delete" option.',
			{
				itemIndex,
			},
		);
	}

	// Get batch configuration from node parameters
	const batchConfig: BatchOperationConfig = {
		maxBatchSize: this.getNodeParameter('maxBatchSize', itemIndex, 25) as number, // Lower batch size for deletes
		maxConcurrency: this.getNodeParameter('maxConcurrency', itemIndex, 2) as number, // Lower concurrency for deletes
		enableProgressTracking: this.getNodeParameter(
			'enableProgressTracking',
			itemIndex,
			true,
		) as boolean,
		enableOptimization: this.getNodeParameter('enableOptimization', itemIndex, true) as boolean,
		retryAttempts: this.getNodeParameter('retryAttempts', itemIndex, 2) as number, // Fewer retries for deletes
		retryDelay: this.getNodeParameter('retryDelay', itemIndex, 2000) as number, // Longer delay for deletes
	};

	// Validate batch size limits for delete operations
	const maxAllowedBatchSize = 50;
	if (batchConfig.maxBatchSize! > maxAllowedBatchSize) {
		throw new NodeOperationError(
			this.getNode(),
			`Maximum batch size for delete operations is ${maxAllowedBatchSize}, got ${batchConfig.maxBatchSize}`,
			{
				itemIndex,
			},
		);
	}

	// Initialize batch processor
	const batchProcessor = new BatchProcessor(this, apiClient);
	const cancellationToken = new CancellationToken();

	// Set up progress tracking if enabled
	let progressData: BatchOperationProgress | null = null;
	if (batchConfig.enableProgressTracking) {
		batchConfig.progressCallback = (progress: BatchOperationProgress) => {
			progressData = progress;
			console.log(
				`Bulk delete boards progress: ${progress.percentage}% (${progress.completed}/${progress.total})`,
			);
		};
	}

	try {
		// Process batch with optimization
		const batchResult = await batchProcessor.processBoardBatch(
			boardIds,
			'delete',
			undefined,
			batchConfig,
			cancellationToken,
		);

		const results: INodeExecutionData[] = [];
		const deletedBoards: string[] = [];

		// Collect successfully deleted board IDs
		for (const deleteResult of batchResult.success) {
			if (deleteResult && typeof deleteResult === 'object' && 'boardId' in deleteResult) {
				deletedBoards.push((deleteResult as any).boardId);
			}
		}

		// Return summary of bulk delete operation
		const summary = {
			operation: 'bulkDeleteBoards',
			success: true,
			totalItems: boardIds.length,
			deletedBoards,
			successCount: deletedBoards.length,
			errorCount: batchResult.errors.length,
			duration: Date.now() - batchResult.progress.startTime,
			optimizations: batchResult.optimizations,
			errors: batchResult.errors,
			deletedAt: new Date().toISOString(),
			...(progressData ? { finalProgress: progressData } : {}),
		};

		results.push({
			json: summary,
			pairedItem: { item: itemIndex },
		});

		return results;
	} catch (error) {
		if (error instanceof Error && error.message.includes('cancelled')) {
			throw new NodeOperationError(
				this.getNode(),
				`Bulk operation was cancelled: ${error.message}`,
				{
					itemIndex,
				},
			);
		}
		throw error;
	} finally {
		// Clean up resources
		batchProcessor.clearCache();
	}
}
