import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import { DataTransformer } from '../../utils/DataTransformer';

/**
 * Get user profile operation handler
 * Retrieves the authenticated user's profile information
 */
export async function getUserProfile(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	try {
		// Get user profile from Pinterest API
		const userProfile = await apiClient.getUserProfile();

		// Transform the response to n8n format
		const transformedProfile = DataTransformer.transformUserProfile(userProfile);

		return {
			json: transformedProfile,
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// Re-throw the error to be handled by the main node execution
		throw error;
	}
}
