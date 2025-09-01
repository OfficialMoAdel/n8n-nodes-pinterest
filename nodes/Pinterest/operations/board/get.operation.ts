import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import { DataTransformer } from '../../utils/DataTransformer';

/**
 * Get board operation handler
 * Retrieves board details and metadata by board ID
 */
export async function getBoard(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	// Get required parameters
	const boardId = this.getNodeParameter('boardId', itemIndex) as string;

	// Validate required fields
	if (!boardId || boardId.trim() === '') {
		throw new NodeOperationError(this.getNode(), 'Board ID is required', {
			itemIndex,
		});
	}

	try {
		// Get board via API
		const response = await apiClient.getBoard(boardId.trim());

		// Transform response to n8n format
		const transformedData = DataTransformer.transformBoardResponse(response);

		return {
			json: transformedData,
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// Re-throw with additional context
		if (error instanceof NodeOperationError) {
			throw error;
		}
		throw new NodeOperationError(this.getNode(), `Failed to get board: ${error.message}`, {
			itemIndex,
		});
	}
}
