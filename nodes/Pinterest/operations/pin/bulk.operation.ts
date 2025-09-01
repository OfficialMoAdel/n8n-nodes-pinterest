import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type {
	UpdatePinRequest,
	BatchOperationConfig,
	BatchOperationProgress,
} from '../../utils/types';
import { DataTransformer } from '../../utils/DataTransformer';
import { BatchProcessor, CancellationToken } from '../../utils/BatchProcessor';

/**
 * Enhanced bulk pin operations handler with optimization and progress tracking
 * Provides efficient batch processing for multiple pins with intelligent optimization
 */

/**
 * Bulk get pins operation with enhanced batch processing
 * Retrieves multiple pins by their IDs with optimization and progress tracking
 */
export async function bulkGetPins(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	// Get pin IDs from node parameters (comma-separated string or array)
	const pinIdsParam = this.getNodeParameter('pinIds', itemIndex) as string | string[];

	let pinIds: string[];
	if (typeof pinIdsParam === 'string') {
		// Split comma-separated string and trim whitespace
		pinIds = pinIdsParam
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0);
	} else {
		pinIds = pinIdsParam;
	}

	// Validate that we have pin IDs
	if (!pinIds || pinIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one pin ID is required', {
			itemIndex,
		});
	}

	// Validate pin ID formats
	for (const pinId of pinIds) {
		if (!/^[a-zA-Z0-9_-]+$/.test(pinId)) {
			throw new NodeOperationError(this.getNode(), `Invalid pin ID format: ${pinId}`, {
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
			// Log progress for debugging (can be enhanced with actual progress reporting)
			console.log(
				`Bulk get pins progress: ${progress.percentage}% (${progress.completed}/${progress.total})`,
			);
		};
	}

	try {
		// Process batch with optimization
		const batchResult = await batchProcessor.processPinBatch(
			pinIds,
			'get',
			undefined,
			batchConfig,
			cancellationToken,
		);

		const results: INodeExecutionData[] = [];

		// Transform successful results
		for (const pinResponse of batchResult.success) {
			const transformedData = DataTransformer.transformPinResponse(pinResponse);
			results.push({
				json: transformedData,
				pairedItem: { item: itemIndex },
			});
		}

		// Add batch operation summary
		const summary = {
			operation: 'bulkGetPins',
			totalItems: pinIds.length,
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
 * Bulk update pins operation with enhanced batch processing
 * Updates multiple pins with the same data using optimization and progress tracking
 */
export async function bulkUpdatePins(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	// Get pin IDs from node parameters
	const pinIdsParam = this.getNodeParameter('pinIds', itemIndex) as string | string[];

	let pinIds: string[];
	if (typeof pinIdsParam === 'string') {
		pinIds = pinIdsParam
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0);
	} else {
		pinIds = pinIdsParam;
	}

	// Validate that we have pin IDs
	if (!pinIds || pinIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one pin ID is required', {
			itemIndex,
		});
	}

	// Validate pin ID formats
	for (const pinId of pinIds) {
		if (!/^[a-zA-Z0-9_-]+$/.test(pinId)) {
			throw new NodeOperationError(this.getNode(), `Invalid pin ID format: ${pinId}`, {
				itemIndex,
			});
		}
	}

	// Get update parameters (same for all pins)
	const title = this.getNodeParameter('title', itemIndex, '') as string;
	const description = this.getNodeParameter('description', itemIndex, '') as string;
	const link = this.getNodeParameter('link', itemIndex, '') as string;
	const boardId = this.getNodeParameter('boardId', itemIndex, '') as string;
	const altText = this.getNodeParameter('altText', itemIndex, '') as string;

	// Build update request object
	const updateData: UpdatePinRequest = {};

	if (title) updateData.title = title;
	if (description) updateData.description = description;
	if (link) {
		try {
			new URL(link);
			updateData.link = link;
		} catch {
			throw new NodeOperationError(this.getNode(), 'Invalid URL format for link', {
				itemIndex,
			});
		}
	}
	if (boardId) {
		if (!/^[a-zA-Z0-9_-]+$/.test(boardId)) {
			throw new NodeOperationError(this.getNode(), 'Invalid board ID format', {
				itemIndex,
			});
		}
		updateData.board_id = boardId;
	}
	if (altText) updateData.alt_text = altText;

	// Check if at least one field is being updated
	if (Object.keys(updateData).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one field must be provided for update (title, description, link, boardId, or altText)',
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
				`Bulk update pins progress: ${progress.percentage}% (${progress.completed}/${progress.total})`,
			);
		};
	}

	try {
		// Process batch with optimization
		const batchResult = await batchProcessor.processPinBatch(
			pinIds,
			'update',
			updateData,
			batchConfig,
			cancellationToken,
		);

		const results: INodeExecutionData[] = [];

		// Transform successful results
		for (const pinResponse of batchResult.success) {
			const transformedData = DataTransformer.transformPinResponse(pinResponse);
			results.push({
				json: transformedData,
				pairedItem: { item: itemIndex },
			});
		}

		// Add batch operation summary
		const summary = {
			operation: 'bulkUpdatePins',
			totalItems: pinIds.length,
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
 * Bulk delete pins operation with enhanced batch processing
 * Deletes multiple pins efficiently with optimization and progress tracking
 */
export async function bulkDeletePins(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	// Get pin IDs from node parameters
	const pinIdsParam = this.getNodeParameter('pinIds', itemIndex) as string | string[];

	let pinIds: string[];
	if (typeof pinIdsParam === 'string') {
		pinIds = pinIdsParam
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0);
	} else {
		pinIds = pinIdsParam;
	}

	// Validate that we have pin IDs
	if (!pinIds || pinIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one pin ID is required', {
			itemIndex,
		});
	}

	// Validate pin ID formats
	for (const pinId of pinIds) {
		if (!/^[a-zA-Z0-9_-]+$/.test(pinId)) {
			throw new NodeOperationError(this.getNode(), `Invalid pin ID format: ${pinId}`, {
				itemIndex,
			});
		}
	}

	// Get confirmation parameter
	const confirmDelete = this.getNodeParameter('confirmDelete', itemIndex, false) as boolean;

	if (!confirmDelete) {
		throw new NodeOperationError(
			this.getNode(),
			'Bulk pin deletion must be confirmed. Please check the "Confirm Delete" option.',
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
				`Bulk delete pins progress: ${progress.percentage}% (${progress.completed}/${progress.total})`,
			);
		};
	}

	try {
		// Process batch with optimization
		const batchResult = await batchProcessor.processPinBatch(
			pinIds,
			'delete',
			undefined,
			batchConfig,
			cancellationToken,
		);

		const results: INodeExecutionData[] = [];
		const deletedPins: string[] = [];

		// Collect successfully deleted pin IDs
		for (const deleteResult of batchResult.success) {
			if (deleteResult && typeof deleteResult === 'object' && 'pinId' in deleteResult) {
				deletedPins.push((deleteResult as any).pinId);
			}
		}

		// Return summary of bulk delete operation
		const summary = {
			operation: 'bulkDeletePins',
			success: true,
			totalItems: pinIds.length,
			deletedPins,
			successCount: deletedPins.length,
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
