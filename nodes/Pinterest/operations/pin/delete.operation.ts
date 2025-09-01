import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';

/**
 * Delete pin operation handler
 * Deletes a pin from Pinterest with proper confirmation handling
 */
export async function deletePin(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	// Get pin ID from node parameters
	const pinId = this.getNodeParameter('pinId', itemIndex) as string;

	// Validate required fields
	if (!pinId) {
		throw new NodeOperationError(this.getNode(), 'Pin ID is required', {
			itemIndex,
		});
	}

	// Validate pin ID format
	if (!/^[a-zA-Z0-9_-]+$/.test(pinId)) {
		throw new NodeOperationError(this.getNode(), 'Invalid pin ID format', {
			itemIndex,
		});
	}

	// Get confirmation parameter (optional safety check)
	const confirmDelete = this.getNodeParameter('confirmDelete', itemIndex, false) as boolean;

	// If confirmation is required but not provided, throw error
	if (!confirmDelete) {
		throw new NodeOperationError(
			this.getNode(),
			'Pin deletion must be confirmed. Please check the "Confirm Delete" option.',
			{
				itemIndex,
			},
		);
	}

	try {
		// Delete pin via Pinterest API
		await apiClient.deletePin(pinId);

		// Return success response with deleted pin ID
		return {
			json: {
				success: true,
				pinId,
				message: 'Pin deleted successfully',
				deletedAt: new Date().toISOString(),
			},
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// Re-throw API errors (already handled by ErrorHandler in PinterestApiClient)
		throw error;
	}
}
