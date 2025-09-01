import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type { UpdatePinRequest } from '../../utils/types';
import { DataTransformer } from '../../utils/DataTransformer';

/**
 * Update pin operation handler
 * Updates pin title, description, and metadata
 */
export async function updatePin(
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

	// Get optional update parameters
	const title = this.getNodeParameter('title', itemIndex, '') as string;
	const description = this.getNodeParameter('description', itemIndex, '') as string;
	const link = this.getNodeParameter('link', itemIndex, '') as string;
	const boardId = this.getNodeParameter('boardId', itemIndex, '') as string;
	const altText = this.getNodeParameter('altText', itemIndex, '') as string;

	// Build update request object with only provided fields
	const updateData: UpdatePinRequest = {};

	if (title) {
		updateData.title = title;
	}

	if (description) {
		updateData.description = description;
	}

	if (link) {
		// Validate URL format if provided
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
		// Validate board ID format
		if (!/^[a-zA-Z0-9_-]+$/.test(boardId)) {
			throw new NodeOperationError(this.getNode(), 'Invalid board ID format', {
				itemIndex,
			});
		}
		updateData.board_id = boardId;
	}

	if (altText) {
		updateData.alt_text = altText;
	}

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

	try {
		// Update pin via Pinterest API
		const pinResponse = await apiClient.updatePin(pinId, updateData);

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
