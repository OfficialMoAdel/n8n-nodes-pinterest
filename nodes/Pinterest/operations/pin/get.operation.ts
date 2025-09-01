import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import { DataTransformer } from '../../utils/DataTransformer';

/**
 * Get pin operation handler
 * Retrieves pin details by ID from Pinterest API
 */
export async function getPin(
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

	// Validate pin ID format (Pinterest pin IDs are typically alphanumeric)
	if (!/^[a-zA-Z0-9_-]+$/.test(pinId)) {
		throw new NodeOperationError(this.getNode(), 'Invalid pin ID format', {
			itemIndex,
		});
	}

	try {
		// Retrieve pin from Pinterest API
		const pinResponse = await apiClient.getPin(pinId);

		// Transform response to n8n format
		const transformedData = DataTransformer.transformPinResponse(pinResponse);

		return {
			json: transformedData,
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// Re-throw API errors (already handled by ErrorHandler in PinterestApiClient)
		throw error;
	}
}
