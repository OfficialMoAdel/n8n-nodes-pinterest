import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type { SearchPinsParams } from '../../utils/types';
import { DataTransformer } from '../../utils/DataTransformer';

/**
 * Search pins operation handler
 * Implements Pinterest pin search with keyword and filter support
 */
export async function searchPins(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		// Get search parameters from node input
		const query = this.getNodeParameter('query', itemIndex) as string;
		const limit = this.getNodeParameter('limit', itemIndex, 25) as number;
		const bookmark = this.getNodeParameter('bookmark', itemIndex, '') as string;
		const creativeTypes = this.getNodeParameter('creativeTypes', itemIndex, []) as string[];
		const createdAt = this.getNodeParameter('createdAt', itemIndex, '') as string;
		const isPromoted = this.getNodeParameter('isPromoted', itemIndex, undefined) as
			| boolean
			| undefined;
		const hasProduct = this.getNodeParameter('hasProduct', itemIndex, undefined) as
			| boolean
			| undefined;
		const isEligibleForRelatedProducts = this.getNodeParameter(
			'isEligibleForRelatedProducts',
			itemIndex,
			undefined,
		) as boolean | undefined;

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
		const searchParams: SearchPinsParams = {
			query: query.trim(),
			limit,
		};

		// Add optional parameters if provided
		if (bookmark && bookmark.trim() !== '') {
			searchParams.bookmark = bookmark.trim();
		}

		if (creativeTypes && creativeTypes.length > 0) {
			searchParams.creative_types = creativeTypes;
		}

		if (createdAt && createdAt.trim() !== '') {
			searchParams.created_at = createdAt.trim();
		}

		if (isPromoted !== undefined) {
			searchParams.is_promoted = isPromoted;
		}

		if (hasProduct !== undefined) {
			searchParams.has_product = hasProduct;
		}

		if (isEligibleForRelatedProducts !== undefined) {
			searchParams.is_eligible_for_related_products = isEligibleForRelatedProducts;
		}

		// Execute search request
		const response = await apiClient.searchPins(searchParams);

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

		// Add individual pin results
		response.items.forEach((pin, index) => {
			results.push({
				json: DataTransformer.transformPinResponse(pin),
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
		throw new NodeOperationError(this.getNode(), `Pin search failed: ${error.message}`, {
			itemIndex,
			description:
				'Please check your search query and try again. Ensure your Pinterest credentials are valid.',
		});
	}
}
