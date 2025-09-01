import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getUserAnalytics } from '../analytics.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { AnalyticsResponse, AnalyticsParams } from '../../../utils/types';
import { DataTransformer } from '../../../utils/DataTransformer';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer');

describe('getUserAnalytics Operation', () => {
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
			getUserAnalytics: jest.fn(),
		} as unknown as jest.Mocked<PinterestApiClient>;
	});

	it('should successfully retrieve user analytics with required parameters only', async () => {
		// Arrange
		const startDate = '2024-01-01';
		const endDate = '2024-01-31';

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(startDate) // startDate
			.mockReturnValueOnce(endDate) // endDate
			.mockReturnValueOnce([]) // metricTypes
			.mockReturnValueOnce([]) // appTypes
			.mockReturnValueOnce('') // splitField
			.mockReturnValueOnce(''); // adAccountId

		const mockAnalyticsResponse: AnalyticsResponse = {
			all_time: {
				impressions: 1000,
				saves: 50,
				clicks: 25,
			},
			daily_metrics: [
				{
					date: '2024-01-01',
					impressions: 100,
					saves: 5,
					clicks: 2,
				},
			],
		};

		const mockTransformedAnalytics = {
			allTime: {
				impressions: 1000,
				saves: 50,
				clicks: 25,
			},
			dailyMetrics: [
				{
					date: '2024-01-01',
					impressions: 100,
					saves: 5,
					clicks: 2,
				},
			],
		};

		mockApiClient.getUserAnalytics.mockResolvedValue(mockAnalyticsResponse);
		(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
			mockTransformedAnalytics,
		);

		// Act
		const result = await getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(mockApiClient.getUserAnalytics).toHaveBeenCalledWith({
			start_date: startDate,
			end_date: endDate,
		});
		expect(DataTransformer.transformAnalyticsResponse).toHaveBeenCalledWith(mockAnalyticsResponse);
		expect(result).toEqual({
			json: {
				...mockTransformedAnalytics,
				requestParams: {
					startDate,
					endDate,
					metricTypes: null,
					appTypes: null,
					splitField: null,
					adAccountId: null,
				},
			},
			pairedItem: { item: 0 },
		});
	});

	it('should successfully retrieve user analytics with all optional parameters', async () => {
		// Arrange
		const startDate = '2024-01-01';
		const endDate = '2024-01-31';
		const metricTypes = ['IMPRESSION', 'SAVE', 'CLICK'];
		const appTypes = ['WEB', 'MOBILE'];
		const splitField = 'APP_TYPE';
		const adAccountId = 'ad123';

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(startDate) // startDate
			.mockReturnValueOnce(endDate) // endDate
			.mockReturnValueOnce(metricTypes) // metricTypes
			.mockReturnValueOnce(appTypes) // appTypes
			.mockReturnValueOnce(splitField) // splitField
			.mockReturnValueOnce(adAccountId); // adAccountId

		const mockAnalyticsResponse: AnalyticsResponse = {
			all_time: {
				impressions: 1000,
				saves: 50,
				clicks: 25,
			},
		};

		const mockTransformedAnalytics = {
			allTime: {
				impressions: 1000,
				saves: 50,
				clicks: 25,
			},
		};

		mockApiClient.getUserAnalytics.mockResolvedValue(mockAnalyticsResponse);
		(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
			mockTransformedAnalytics,
		);

		// Act
		const result = await getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(mockApiClient.getUserAnalytics).toHaveBeenCalledWith({
			start_date: startDate,
			end_date: endDate,
			metric_types: metricTypes,
			app_types: appTypes,
			split_field: splitField,
			ad_account_id: adAccountId,
		});
		expect(result.json.requestParams).toEqual({
			startDate,
			endDate,
			metricTypes,
			appTypes,
			splitField,
			adAccountId,
		});
	});

	it('should throw error when start date is missing', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'startDate') return '';
			if (paramName === 'endDate') return '2024-01-31';
			return [];
		});

		// Act & Assert
		await expect(getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'Start date is required for analytics',
		);

		expect(mockApiClient.getUserAnalytics).not.toHaveBeenCalled();
	});

	it('should throw error when end date is missing', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'startDate') return '2024-01-01';
			if (paramName === 'endDate') return '';
			return [];
		});

		// Act & Assert
		await expect(getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'End date is required for analytics',
		);

		expect(mockApiClient.getUserAnalytics).not.toHaveBeenCalled();
	});

	it('should handle API errors gracefully', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('2024-01-01') // startDate
			.mockReturnValueOnce('2024-01-31') // endDate
			.mockReturnValueOnce([]) // metricTypes
			.mockReturnValueOnce([]) // appTypes
			.mockReturnValueOnce('') // splitField
			.mockReturnValueOnce(''); // adAccountId

		const mockError = new Error('API Error');
		mockApiClient.getUserAnalytics.mockRejectedValue(mockError);

		// Act & Assert
		await expect(getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'API Error',
		);

		expect(mockApiClient.getUserAnalytics).toHaveBeenCalledTimes(1);
		expect(DataTransformer.transformAnalyticsResponse).not.toHaveBeenCalled();
	});

	it('should handle empty analytics response', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('2024-01-01') // startDate
			.mockReturnValueOnce('2024-01-31') // endDate
			.mockReturnValueOnce([]) // metricTypes
			.mockReturnValueOnce([]) // appTypes
			.mockReturnValueOnce('') // splitField
			.mockReturnValueOnce(''); // adAccountId

		const mockAnalyticsResponse: AnalyticsResponse = {};
		const mockTransformedAnalytics = {};

		mockApiClient.getUserAnalytics.mockResolvedValue(mockAnalyticsResponse);
		(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
			mockTransformedAnalytics,
		);

		// Act
		const result = await getUserAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(result.json).toEqual({
			...mockTransformedAnalytics,
			requestParams: {
				startDate: '2024-01-01',
				endDate: '2024-01-31',
				metricTypes: null,
				appTypes: null,
				splitField: null,
				adAccountId: null,
			},
		});
	});
});
