import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getPinAnalytics } from '../pin-analytics.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { AnalyticsResponse, AnalyticsParams } from '../../../utils/types';
import { DataTransformer } from '../../../utils/DataTransformer';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer');

describe('getPinAnalytics Operation', () => {
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
			getPinAnalytics: jest.fn(),
		} as unknown as jest.Mocked<PinterestApiClient>;
	});

	it('should successfully retrieve pin analytics with required parameters only', async () => {
		// Arrange
		const pinId = 'pin123';
		const startDate = '2024-01-01';
		const endDate = '2024-01-31';

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(pinId) // pinId
			.mockReturnValueOnce(startDate) // startDate
			.mockReturnValueOnce(endDate) // endDate
			.mockReturnValueOnce([]) // metricTypes
			.mockReturnValueOnce([]) // appTypes
			.mockReturnValueOnce(''); // splitField

		const mockAnalyticsResponse: AnalyticsResponse = {
			all_time: {
				impressions: 500,
				saves: 25,
				clicks: 10,
			},
			daily_metrics: [
				{
					date: '2024-01-01',
					impressions: 50,
					saves: 2,
					clicks: 1,
				},
			],
		};

		const mockTransformedAnalytics = {
			allTime: {
				impressions: 500,
				saves: 25,
				clicks: 10,
			},
			dailyMetrics: [
				{
					date: '2024-01-01',
					impressions: 50,
					saves: 2,
					clicks: 1,
				},
			],
		};

		mockApiClient.getPinAnalytics.mockResolvedValue(mockAnalyticsResponse);
		(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
			mockTransformedAnalytics,
		);

		// Act
		const result = await getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(mockApiClient.getPinAnalytics).toHaveBeenCalledWith(pinId, {
			start_date: startDate,
			end_date: endDate,
		});
		expect(DataTransformer.transformAnalyticsResponse).toHaveBeenCalledWith(mockAnalyticsResponse);
		expect(result).toEqual({
			json: {
				...mockTransformedAnalytics,
				requestParams: {
					pinId,
					startDate,
					endDate,
					metricTypes: null,
					appTypes: null,
					splitField: null,
				},
			},
			pairedItem: { item: 0 },
		});
	});

	it('should successfully retrieve pin analytics with all optional parameters', async () => {
		// Arrange
		const pinId = 'pin123';
		const startDate = '2024-01-01';
		const endDate = '2024-01-31';
		const metricTypes = ['IMPRESSION', 'SAVE', 'CLICK'];
		const appTypes = ['WEB', 'MOBILE'];
		const splitField = 'APP_TYPE';

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(pinId) // pinId
			.mockReturnValueOnce(startDate) // startDate
			.mockReturnValueOnce(endDate) // endDate
			.mockReturnValueOnce(metricTypes) // metricTypes
			.mockReturnValueOnce(appTypes) // appTypes
			.mockReturnValueOnce(splitField); // splitField

		const mockAnalyticsResponse: AnalyticsResponse = {
			all_time: {
				impressions: 500,
				saves: 25,
				clicks: 10,
			},
		};

		const mockTransformedAnalytics = {
			allTime: {
				impressions: 500,
				saves: 25,
				clicks: 10,
			},
		};

		mockApiClient.getPinAnalytics.mockResolvedValue(mockAnalyticsResponse);
		(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
			mockTransformedAnalytics,
		);

		// Act
		const result = await getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(mockApiClient.getPinAnalytics).toHaveBeenCalledWith(pinId, {
			start_date: startDate,
			end_date: endDate,
			metric_types: metricTypes,
			app_types: appTypes,
			split_field: splitField,
		});
		expect(result.json.requestParams).toEqual({
			pinId,
			startDate,
			endDate,
			metricTypes,
			appTypes,
			splitField,
		});
	});

	it('should throw error when pin ID is missing', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('') // pinId (empty)
			.mockReturnValueOnce('2024-01-01') // startDate
			.mockReturnValueOnce('2024-01-31'); // endDate

		// Act & Assert
		await expect(getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'Pin ID is required for pin analytics',
		);

		expect(mockApiClient.getPinAnalytics).not.toHaveBeenCalled();
	});

	it('should throw error when start date is missing', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'pinId') return 'pin123';
			if (paramName === 'startDate') return '';
			if (paramName === 'endDate') return '2024-01-31';
			return [];
		});

		// Act & Assert
		await expect(getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'Start date is required for analytics',
		);

		expect(mockApiClient.getPinAnalytics).not.toHaveBeenCalled();
	});

	it('should throw error when end date is missing', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'pinId') return 'pin123';
			if (paramName === 'startDate') return '2024-01-01';
			if (paramName === 'endDate') return '';
			return [];
		});

		// Act & Assert
		await expect(getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'End date is required for analytics',
		);

		expect(mockApiClient.getPinAnalytics).not.toHaveBeenCalled();
	});

	it('should handle API errors gracefully', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('pin123') // pinId
			.mockReturnValueOnce('2024-01-01') // startDate
			.mockReturnValueOnce('2024-01-31') // endDate
			.mockReturnValueOnce([]) // metricTypes
			.mockReturnValueOnce([]) // appTypes
			.mockReturnValueOnce(''); // splitField

		const mockError = new Error('Pin not found');
		mockApiClient.getPinAnalytics.mockRejectedValue(mockError);

		// Act & Assert
		await expect(getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'Pin not found',
		);

		expect(mockApiClient.getPinAnalytics).toHaveBeenCalledTimes(1);
		expect(DataTransformer.transformAnalyticsResponse).not.toHaveBeenCalled();
	});

	it('should handle empty analytics response', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('pin123') // pinId
			.mockReturnValueOnce('2024-01-01') // startDate
			.mockReturnValueOnce('2024-01-31') // endDate
			.mockReturnValueOnce([]) // metricTypes
			.mockReturnValueOnce([]) // appTypes
			.mockReturnValueOnce(''); // splitField

		const mockAnalyticsResponse: AnalyticsResponse = {};
		const mockTransformedAnalytics = {};

		mockApiClient.getPinAnalytics.mockResolvedValue(mockAnalyticsResponse);
		(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
			mockTransformedAnalytics,
		);

		// Act
		const result = await getPinAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(result.json).toEqual({
			...mockTransformedAnalytics,
			requestParams: {
				pinId: 'pin123',
				startDate: '2024-01-01',
				endDate: '2024-01-31',
				metricTypes: null,
				appTypes: null,
				splitField: null,
			},
		});
	});
});
