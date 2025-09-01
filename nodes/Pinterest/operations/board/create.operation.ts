import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type { CreateBoardRequest } from '../../utils/types';
import { DataTransformer } from '../../utils/DataTransformer';

/**
 * Create board operation handler
 * Creates a new Pinterest board with name, description, and privacy settings
 */
export async function createBoard(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	// Get required parameters
	const name = this.getNodeParameter('name', itemIndex) as string;
	const description = this.getNodeParameter('description', itemIndex, '') as string;
	const privacy = this.getNodeParameter('privacy', itemIndex, 'public') as
		| 'public'
		| 'protected'
		| 'secret';

	// Validate required fields
	if (!name || name.trim() === '') {
		throw new NodeOperationError(this.getNode(), 'Board name is required', {
			itemIndex,
		});
	}

	// Validate privacy setting
	const validPrivacySettings = ['public', 'protected', 'secret'];
	if (!validPrivacySettings.includes(privacy)) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid privacy setting. Must be one of: ${validPrivacySettings.join(', ')}`,
			{
				itemIndex,
			},
		);
	}

	// Prepare board data
	const boardData: CreateBoardRequest = {
		name: name.trim(),
		privacy,
	};

	// Add description if provided
	if (description && description.trim() !== '') {
		boardData.description = description.trim();
	}

	try {
		// Create board via API
		const response = await apiClient.createBoard(boardData);

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
		throw new NodeOperationError(this.getNode(), `Failed to create board: ${error.message}`, {
			itemIndex,
		});
	}
}
