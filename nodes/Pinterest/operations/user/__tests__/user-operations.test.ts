import type { IExecuteFunctions } from 'n8n-workflow';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { UserProfileResponse, AnalyticsResponse } from '../../../utils/types';
import { getUserProfile } from '../profile.operation';
import { getUserAnalytics } from '../analytics.operation';
import { getPinAnalytics } from '../pin-analytics.operation';
import { getBoardAnalytics } from '../board-analytics.operation';
import { DataTransformer } from '../../../utils/DataTransformer';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer');

describe('User Operations Integration', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockApiClient: jest.Mocked<PinterestApiClient>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock IExecuteFunctions
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue({ name: 'Pinterest' }),
		} as unknown as jest.Mocked<IExecuteFunctions>;

		// Mock PinterestApiClient
		mockApiClient = {
			getUserProfile: jest.fn(),
			getUserAnalytics: jest.fn(),
			getPinAnalytics: jest.fn(),
			getBoardAnalytics: jest.fn(),
		} as unknown as jest.Mocked<PinterestApiClient>;
	});

	describe('User Profile and Analytics Workflow', () => {
		it('should successfully retrieve user profile and then analytics', async () => {
			// Arrange - User Profile
			const mockUserProfile: UserProfileResponse = {
				id: 'user123',
				username: 'testuser',
				first_name: 'Test',
				last_name: 'User',
				display_name: 'Test User',
				bio: 'Test bio',
				avatar_url: 'https://example.com/avatar.jpg',
				profile_url: 'https://pinterest.com/testuser',
				account_type: 'business',
				website_url: 'https://example.com',
				is_verified_merchant: true,
			};

			const mockTransformedProfile = {
				userId: 'user123',
				username: 'testuser',
				displayName: 'Test User',
				firstName: 'Test',
				lastName: 'User',
				bio: 'Test bio',
				avatarUrl: 'https://example.com/avatar.jpg',
				profileUrl: 'https://pinterest.com/testuser',
				accountType: 'business',
				websiteUrl: 'https://example.com',
				isVerifiedMerchant: true,
			};

			// Arrange - User Analytics
			const startDate = '2024-01-01';
			const endDate = '2024-01-31';
			const mockAnalyticsResponse: AnalyticsResponse = {
				all_time: {
					impressions: 10000,
					saves: 500,
					clicks: 250,
					pin_clicks: 150,
					outbound_clicks: 100,
				},
				daily_metrics: [
					{
						date: '2024-01-01',
						impressions: 1000,
						saves: 50,
						clicks: 25,
					},
					{
						date: '2024-01-02',
						impressions: 1200,
						saves: 60,
						clicks: 30,
					},
				],
			};

			const mockTransformedAnalytics = {
				allTime: {
					impressions: 10000,
					saves: 500,
					clicks: 250,
					pin_clicks: 150,
					outbound_clicks: 100,
				},
				dailyMetrics: [
					{
						date: '2024-01-01',
						impressions: 1000,
						saves: 50,
						clicks: 25,
					},
					{
						date: '2024-01-02',
						impressions: 1200,
						saves: 60,
						clicks: 30,
					},
				],
			};

			// Mock API responses
			mockApiClient.getUserProfile.mockResolvedValue(mockUserProfile);
			mockApiClient.getUserAnalytics.mockResolvedValue(mockAnalyticsResponse);
			(DataTransformer.transformUserProfile as jest.Mock).mockReturnValue(mockTransformedProfile);
			(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
				mockTransformedAnalytics,
			);

			// Mock parameters for analytics
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(startDate) // startDate
				.mockReturnValueOnce(endDate) // endDate
				.mockReturnValueOnce(['IMPRESSION', 'SAVE', 'CLICK']) // metricTypes
				.mockReturnValueOnce(['WEB']) // appTypes
				.mockReturnValueOnce('') // splitField
				.mockReturnValueOnce(''); // adAccountId

			// Act - Get user profile
			const profileResult = await getUserProfile.call(mockExecuteFunctions, mockApiClient, 0);

			// Act - Get user analytics
			const analyticsResult = await getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert - Profile
			expect(mockApiClient.getUserProfile).toHaveBeenCalledTimes(1);
			expect(DataTransformer.transformUserProfile).toHaveBeenCalledWith(mockUserProfile);
			expect(profileResult).toEqual({
				json: mockTransformedProfile,
				pairedItem: { item: 0 },
			});

			// Assert - Analytics
			expect(mockApiClient.getUserAnalytics).toHaveBeenCalledWith({
				start_date: startDate,
				end_date: endDate,
				metric_types: ['IMPRESSION', 'SAVE', 'CLICK'],
				app_types: ['WEB'],
			});
			expect(DataTransformer.transformAnalyticsResponse).toHaveBeenCalledWith(
				mockAnalyticsResponse,
			);
			expect(analyticsResult.json).toEqual({
				...mockTransformedAnalytics,
				requestParams: {
					startDate,
					endDate,
					metricTypes: ['IMPRESSION', 'SAVE', 'CLICK'],
					appTypes: ['WEB'],
					splitField: null,
					adAccountId: null,
				},
			});
		});
	});

	describe('Pin and Board Analytics Comparison', () => {
		it('should retrieve analytics for both pins and boards with same date range', async () => {
			// Arrange
			const pinId = 'pin123';
			const boardId = 'board456';
			const startDate = '2024-01-01';
			const endDate = '2024-01-31';

			const mockPinAnalytics: AnalyticsResponse = {
				all_time: {
					impressions: 1000,
					saves: 50,
					clicks: 25,
				},
			};

			const mockBoardAnalytics: AnalyticsResponse = {
				all_time: {
					impressions: 5000,
					saves: 250,
					clicks: 125,
				},
			};

			const mockTransformedPinAnalytics = {
				allTime: {
					impressions: 1000,
					saves: 50,
					clicks: 25,
				},
			};

			const mockTransformedBoardAnalytics = {
				allTime: {
					impressions: 5000,
					saves: 250,
					clicks: 125,
				},
			};

			// Mock API responses
			mockApiClient.getPinAnalytics.mockResolvedValue(mockPinAnalytics);
			mockApiClient.getBoardAnalytics.mockResolvedValue(mockBoardAnalytics);
			(DataTransformer.transformAnalyticsResponse as jest.Mock)
				.mockReturnValueOnce(mockTransformedPinAnalytics)
				.mockReturnValueOnce(mockTransformedBoardAnalytics);

			// Mock parameters for pin analytics
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce(startDate) // startDate
				.mockReturnValueOnce(endDate) // endDate
				.mockReturnValueOnce([]) // metricTypes
				.mockReturnValueOnce([]) // appTypes
				.mockReturnValueOnce('') // splitField
				// Mock parameters for board analytics
				.mockReturnValueOnce(boardId) // boardId
				.mockReturnValueOnce(startDate) // startDate
				.mockReturnValueOnce(endDate) // endDate
				.mockReturnValueOnce([]) // metricTypes
				.mockReturnValueOnce([]) // appTypes
				.mockReturnValueOnce(''); // splitField

			// Act
			const pinAnalyticsResult = await getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0);
			const boardAnalyticsResult = await getBoardAnalytics.call(
				mockExecuteFunctions,
				mockApiClient,
				1,
			);

			// Assert
			expect(mockApiClient.getPinAnalytics).toHaveBeenCalledWith(pinId, {
				start_date: startDate,
				end_date: endDate,
			});
			expect(mockApiClient.getBoardAnalytics).toHaveBeenCalledWith(boardId, {
				start_date: startDate,
				end_date: endDate,
			});

			expect((pinAnalyticsResult.json.requestParams as any).pinId).toBe(pinId);
			expect((boardAnalyticsResult.json.requestParams as any).boardId).toBe(boardId);

			// Verify that board analytics show higher numbers (as expected)
			expect(mockTransformedBoardAnalytics.allTime.impressions).toBeGreaterThan(
				mockTransformedPinAnalytics.allTime.impressions,
			);
		});
	});

	describe('Error Handling Consistency', () => {
		it('should handle API errors consistently across all operations', async () => {
			// Arrange
			const apiError = new Error('Pinterest API rate limit exceeded');
			mockApiClient.getUserProfile.mockRejectedValue(apiError);
			mockApiClient.getUserAnalytics.mockRejectedValue(apiError);
			mockApiClient.getPinAnalytics.mockRejectedValue(apiError);
			mockApiClient.getBoardAnalytics.mockRejectedValue(apiError);

			// Mock parameters for analytics operations
			mockExecuteFunctions.getNodeParameter.mockReturnValue('test-value'); // Generic mock for all parameter calls

			// Act & Assert - All operations should propagate the error
			await expect(getUserProfile.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Pinterest API rate limit exceeded',
			);

			await expect(getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Pinterest API rate limit exceeded',
			);

			await expect(getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Pinterest API rate limit exceeded',
			);

			await expect(getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Pinterest API rate limit exceeded',
			);
		});
	});

	describe('Data Transformation Consistency', () => {
		it('should use DataTransformer consistently for all analytics operations', async () => {
			// Arrange
			const mockAnalyticsResponse: AnalyticsResponse = {
				all_time: { impressions: 100 },
			};
			const mockTransformedResponse = { allTime: { impressions: 100 } };

			mockApiClient.getUserAnalytics.mockResolvedValue(mockAnalyticsResponse);
			mockApiClient.getPinAnalytics.mockResolvedValue(mockAnalyticsResponse);
			mockApiClient.getBoardAnalytics.mockResolvedValue(mockAnalyticsResponse);
			(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
				mockTransformedResponse,
			);

			// Mock parameters
			mockExecuteFunctions.getNodeParameter.mockReturnValue('test-value');

			// Act
			await getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0);
			await getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0);
			await getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert - DataTransformer should be called for all analytics operations
			expect(DataTransformer.transformAnalyticsResponse).toHaveBeenCalledTimes(3);
			expect(DataTransformer.transformAnalyticsResponse).toHaveBeenCalledWith(
				mockAnalyticsResponse,
			);
		});
	});
});
