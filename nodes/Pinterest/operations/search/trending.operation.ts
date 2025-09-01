import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type { TrendingParams } from '../../utils/types';

/**
 * Get trending content operation handler
 * Implements access to popular pins, topics, and hashtags
 */
export async function getTrending(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	try {
		// Get trending parameters from node input
		const region = this.getNodeParameter('region', itemIndex, '') as string;
		const trendingTypes = this.getNodeParameter('trendingTypes', itemIndex, []) as string[];

		// Build trending parameters
		const trendingParams: TrendingParams = {};

		// Add optional parameters if provided
		if (region && region.trim() !== '') {
			trendingParams.region = region.trim();
		}

		if (trendingTypes && trendingTypes.length > 0) {
			trendingParams.trending_types = trendingTypes;
		}

		// Execute trending request
		const response = await apiClient.getTrending(trendingParams);

		// Transform and return results
		const results: INodeExecutionData[] = [];

		// Add trending metadata as first item
		results.push({
			json: {
				region: region || 'global',
				trendingTypes: trendingTypes,
				totalTrends: response.trends.length,
				retrievedAt: new Date().toISOString(),
			},
			pairedItem: { item: itemIndex },
		});

		// Add individual trending items
		response.trends.forEach((trend, index) => {
			results.push({
				json: {
					keyword: trend.keyword,
					percentGrowthWeekOverWeek: trend.pct_growth_wow,
					percentGrowthYearOverYear: trend.pct_growth_yoy,
					timeSeries: trend.time_series,
					trendIndex: index + 1,
				},
				pairedItem: { item: itemIndex },
			});
		});

		return results;
	} catch (error) {
		// Handle specific trending errors
		if (error instanceof NodeOperationError) {
			throw error;
		}

		// Handle API errors
		throw new NodeOperationError(
			this.getNode(),
			`Trending content retrieval failed: ${error.message}`,
			{
				itemIndex,
				description:
					'Please check your parameters and try again. Ensure your Pinterest credentials are valid.',
			},
		);
	}
}
