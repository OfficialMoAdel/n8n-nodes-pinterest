import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type { UpdateBoardRequest } from '../../utils/types';
import { DataTransformer } from '../../utils/DataTransformer';

/**
 * Update board operation handler
 * Updates board properties like name, description, and privacy settings
 */
export async function updateBoard(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	// Get required parameters
	const boardId = this.getNodeParameter('boardId', itemIndex) as string;
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const description = this.getNodeParameter('description', itemIndex, '') as string;
	const privacy = this.getNodeParameter('privacy', itemIndex, '') as string;

	// Validate required fields
	if (!boardId || boardId.trim() === '') {
		throw new NodeOperationError(this.getNode(), 'Board ID is required', {
			itemIndex,
		});
	}

	// Prepare update data - only include fields that are provided
	const updateData: UpdateBoardRequest = {};
	let hasUpdates = false;

	if (name && name.trim() !== '') {
		updateData.name = name.trim();
		hasUpdates = true;
	}

	if (description && description.trim() !== '') {
		updateData.description = description.trim();
		hasUpdates = true;
	}

	if (privacy && privacy.trim() !== '') {
		// Validate privacy setting
		const validPrivacySettings = ['public', 'protected', 'secret'];
		const privacyValue = privacy.trim() as 'public' | 'protected' | 'secret';

		if (!validPrivacySettings.includes(privacyValue)) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid privacy setting. Must be one of: ${validPrivacySettings.join(', ')}`,
				{
					itemIndex,
				},
			);
		}

		updateData.privacy = privacyValue;
		hasUpdates = true;
	}

	// Check if at least one field is being updated
	if (!hasUpdates) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one field (name, description, or privacy) must be provided for update',
			{
				itemIndex,
			},
		);
	}

	try {
		// Update board via API
		const response = await apiClient.updateBoard(boardId.trim(), updateData);

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
		throw new NodeOperationError(this.getNode(), `Failed to update board: ${error.message}`, {
			itemIndex,
		});
	}
}
