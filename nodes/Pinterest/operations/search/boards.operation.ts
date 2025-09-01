import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type { SearchBoardsParams } from '../../utils/types';
import { DataTransformer } from '../../utils/DataTransformer';

/**
 * Search boards operation handler
 * Implements Pinterest board search with metadata filtering
 */
export async function searchBoards(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		// Get search parameters from node input
		const query = this.getNodeParameter('query', itemIndex) as string;
		const limit = this.getNodeParameter('limit', itemIndex, 25) as number;
		const bookmark = this.getNodeParameter('bookmark', itemIndex, '') as string;

		// Validate required parameters
		if (!query || query.trim() === '') {
			throw new NodeOperationError(this.getNode(), 'Search query is required', {
				itemIndex,
			});
		}

		// Validate limit parameter
		if (limit < 1 || limit > 250) {
			throw new NodeOperationError(this.getNode(), 'Limit must be between 1 and 250', {
				itemIndex,
			});
		}

		// Build search parameters
		const searchParams: SearchBoardsParams = {
			query: query.trim(),
			limit,
		};

		// Add optional parameters if provided
		if (bookmark && bookmark.trim() !== '') {
			searchParams.bookmark = bookmark.trim();
		}

		// Execute search request
		const response = await apiClient.searchBoards(searchParams);

		// Transform and return results
		const results: INodeExecutionData[] = [];

		// Add search metadata as first item
		results.push({
			json: {
				searchQuery: query,
				totalResults: response.items.length,
				bookmark: response.bookmark,
				hasMore: !!response.bookmark,
			},
			pairedItem: { item: itemIndex },
		});

		// Add individual board results
		response.items.forEach((board, index) => {
			results.push({
				json: DataTransformer.transformBoardResponse(board),
				pairedItem: { item: itemIndex },
			});
		});

		return results;
	} catch (error) {
		// Handle specific search errors
		if (error instanceof NodeOperationError) {
			throw error;
		}

		// Handle API errors
		throw new NodeOperationError(this.getNode(), `Board search failed: ${error.message}`, {
			itemIndex,
			description:
				'Please check your search query and try again. Ensure your Pinterest credentials are valid.',
		});
	}
}
