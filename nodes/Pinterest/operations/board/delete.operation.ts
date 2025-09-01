import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';

/**
 * Delete board operation handler
 * Deletes a Pinterest board and handles dependencies for contained pins
 */
export async function deleteBoard(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	// Get required parameters
	const boardId = this.getNodeParameter('boardId', itemIndex) as string;
	const confirmDeletion = this.getNodeParameter('confirmDeletion', itemIndex, false) as boolean;

	// Validate required fields
	if (!boardId || boardId.trim() === '') {
		throw new NodeOperationError(this.getNode(), 'Board ID is required', {
			itemIndex,
		});
	}

	// Require explicit confirmation for deletion
	if (!confirmDeletion) {
		throw new NodeOperationError(
			this.getNode(),
			'Board deletion requires explicit confirmation. Set "confirmDeletion" to true to proceed.',
			{
				itemIndex,
			},
		);
	}

	try {
		// First, get board information to provide context in response
		let boardInfo;
		try {
			boardInfo = await apiClient.getBoard(boardId.trim());
		} catch (error) {
			// If board doesn't exist, that's fine for deletion
			if (error.message?.includes('404') || error.message?.includes('Not Found')) {
				return {
					json: {
						success: true,
						boardId: boardId.trim(),
						message: 'Board not found (may have been already deleted)',
						deletedAt: new Date().toISOString(),
					},
					pairedItem: { item: itemIndex },
				};
			}
			throw error;
		}

		// Delete board via API
		await apiClient.deleteBoard(boardId.trim());

		// Return success response with board information
		return {
			json: {
				success: true,
				boardId: boardId.trim(),
				boardName: boardInfo.name,
				message: `Board "${boardInfo.name}" has been successfully deleted`,
				deletedAt: new Date().toISOString(),
				pinCount: boardInfo.pin_count,
				warning:
					boardInfo.pin_count > 0
						? `This board contained ${boardInfo.pin_count} pins which have also been deleted`
						: undefined,
			},
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// Re-throw with additional context
		if (error instanceof NodeOperationError) {
			throw error;
		}
		throw new NodeOperationError(this.getNode(), `Failed to delete board: ${error.message}`, {
			itemIndex,
		});
	}
}
