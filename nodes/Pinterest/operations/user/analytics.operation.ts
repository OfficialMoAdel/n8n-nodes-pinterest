import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type { AnalyticsParams } from '../../utils/types';
import { DataTransformer } from '../../utils/DataTransformer';

/**
 * Get user analytics operation handler
 * Retrieves analytics data for the authenticated user's account
 */
export async function getUserAnalytics(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	try {
		// Get required parameters
		const startDate = this.getNodeParameter('startDate', itemIndex) as string;
		const endDate = this.getNodeParameter('endDate', itemIndex) as string;

		// Validate required parameters
		if (!startDate) {
			throw new NodeOperationError(this.getNode(), 'Start date is required for analytics');
		}
		if (!endDate) {
			throw new NodeOperationError(this.getNode(), 'End date is required for analytics');
		}

		// Get optional parameters
		const metricTypes = this.getNodeParameter('metricTypes', itemIndex, []) as string[];
		const appTypes = this.getNodeParameter('appTypes', itemIndex, []) as string[];
		const splitField = this.getNodeParameter('splitField', itemIndex, '') as string;
		const adAccountId = this.getNodeParameter('adAccountId', itemIndex, '') as string;

		// Build analytics parameters
		const analyticsParams: AnalyticsParams = {
			start_date: startDate,
			end_date: endDate,
		};

		// Add optional parameters if provided
		if (metricTypes.length > 0) {
			analyticsParams.metric_types = metricTypes;
		}
		if (appTypes.length > 0) {
			analyticsParams.app_types = appTypes;
		}
		if (splitField) {
			analyticsParams.split_field = splitField;
		}
		if (adAccountId) {
			analyticsParams.ad_account_id = adAccountId;
		}

		// Get analytics data from Pinterest API
		const analyticsData = await apiClient.getUserAnalytics(analyticsParams);

		// Transform the response to n8n format
		const transformedAnalytics = DataTransformer.transformAnalyticsResponse(analyticsData);

		return {
			json: {
				...transformedAnalytics,
				// Include request parameters for reference
				requestParams: {
					startDate,
					endDate,
					metricTypes: metricTypes.length > 0 ? metricTypes : null,
					appTypes: appTypes.length > 0 ? appTypes : null,
					splitField: splitField || null,
					adAccountId: adAccountId || null,
				},
			},
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// Re-throw the error to be handled by the main node execution
		throw error;
	}
}
