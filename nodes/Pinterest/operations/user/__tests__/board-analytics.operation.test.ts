import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getBoardAnalytics } from '../board-analytics.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { AnalyticsResponse, AnalyticsParams } from '../../../utils/types';
import { DataTransformer } from '../../../utils/DataTransformer';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer');

describe('getBoardAnalytics Operation', () => {
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
			getBoardAnalytics: jest.fn(),
		} as unknown as jest.Mocked<PinterestApiClient>;
	});

	it('should successfully retrieve board analytics with required parameters only', async () => {
		// Arrange
		const boardId = 'board123';
		const startDate = '2024-01-01';
		const endDate = '2024-01-31';

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(boardId) // boardId
			.mockReturnValueOnce(startDate) // startDate
			.mockReturnValueOnce(endDate) // endDate
			.mockReturnValueOnce([]) // metricTypes
			.mockReturnValueOnce([]) // appTypes
			.mockReturnValueOnce(''); // splitField

		const mockAnalyticsResponse: AnalyticsResponse = {
			all_time: {
				impressions: 2000,
				saves: 100,
				clicks: 50,
			},
			daily_metrics: [
				{
					date: '2024-01-01',
					impressions: 200,
					saves: 10,
					clicks: 5,
				},
			],
		};

		const mockTransformedAnalytics = {
			allTime: {
				impressions: 2000,
				saves: 100,
				clicks: 50,
			},
			dailyMetrics: [
				{
					date: '2024-01-01',
					impressions: 200,
					saves: 10,
					clicks: 5,
				},
			],
		};

		mockApiClient.getBoardAnalytics.mockResolvedValue(mockAnalyticsResponse);
		(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
			mockTransformedAnalytics,
		);

		// Act
		const result = await getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(mockApiClient.getBoardAnalytics).toHaveBeenCalledWith(boardId, {
			start_date: startDate,
			end_date: endDate,
		});
		expect(DataTransformer.transformAnalyticsResponse).toHaveBeenCalledWith(mockAnalyticsResponse);
		expect(result).toEqual({
			json: {
				...mockTransformedAnalytics,
				requestParams: {
					boardId,
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

	it('should successfully retrieve board analytics with all optional parameters', async () => {
		// Arrange
		const boardId = 'board123';
		const startDate = '2024-01-01';
		const endDate = '2024-01-31';
		const metricTypes = ['IMPRESSION', 'SAVE', 'CLICK'];
		const appTypes = ['WEB', 'MOBILE'];
		const splitField = 'APP_TYPE';

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(boardId) // boardId
			.mockReturnValueOnce(startDate) // startDate
			.mockReturnValueOnce(endDate) // endDate
			.mockReturnValueOnce(metricTypes) // metricTypes
			.mockReturnValueOnce(appTypes) // appTypes
			.mockReturnValueOnce(splitField); // splitField

		const mockAnalyticsResponse: AnalyticsResponse = {
			all_time: {
				impressions: 2000,
				saves: 100,
				clicks: 50,
			},
		};

		const mockTransformedAnalytics = {
			allTime: {
				impressions: 2000,
				saves: 100,
				clicks: 50,
			},
		};

		mockApiClient.getBoardAnalytics.mockResolvedValue(mockAnalyticsResponse);
		(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
			mockTransformedAnalytics,
		);

		// Act
		const result = await getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(mockApiClient.getBoardAnalytics).toHaveBeenCalledWith(boardId, {
			start_date: startDate,
			end_date: endDate,
			metric_types: metricTypes,
			app_types: appTypes,
			split_field: splitField,
		});
		expect(result.json.requestParams).toEqual({
			boardId,
			startDate,
			endDate,
			metricTypes,
			appTypes,
			splitField,
		});
	});

	it('should throw error when board ID is missing', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('') // boardId (empty)
			.mockReturnValueOnce('2024-01-01') // startDate
			.mockReturnValueOnce('2024-01-31'); // endDate

		// Act & Assert
		await expect(getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'Board ID is required for board analytics',
		);

		expect(mockApiClient.getBoardAnalytics).not.toHaveBeenCalled();
	});

	it('should throw error when start date is missing', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'boardId') return 'board123';
			if (paramName === 'startDate') return '';
			if (paramName === 'endDate') return '2024-01-31';
			return [];
		});

		// Act & Assert
		await expect(getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'Start date is required for analytics',
		);

		expect(mockApiClient.getBoardAnalytics).not.toHaveBeenCalled();
	});

	it('should throw error when end date is missing', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'boardId') return 'board123';
			if (paramName === 'startDate') return '2024-01-01';
			if (paramName === 'endDate') return '';
			return [];
		});

		// Act & Assert
		await expect(getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'End date is required for analytics',
		);

		expect(mockApiClient.getBoardAnalytics).not.toHaveBeenCalled();
	});

	it('should handle API errors gracefully', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('board123') // boardId
			.mockReturnValueOnce('2024-01-01') // startDate
			.mockReturnValueOnce('2024-01-31') // endDate
			.mockReturnValueOnce([]) // metricTypes
			.mockReturnValueOnce([]) // appTypes
			.mockReturnValueOnce(''); // splitField

		const mockError = new Error('Board not found');
		mockApiClient.getBoardAnalytics.mockRejectedValue(mockError);

		// Act & Assert
		await expect(getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'Board not found',
		);

		expect(mockApiClient.getBoardAnalytics).toHaveBeenCalledTimes(1);
		expect(DataTransformer.transformAnalyticsResponse).not.toHaveBeenCalled();
	});

	it('should handle empty analytics response', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('board123') // boardId
			.mockReturnValueOnce('2024-01-01') // startDate
			.mockReturnValueOnce('2024-01-31') // endDate
			.mockReturnValueOnce([]) // metricTypes
			.mockReturnValueOnce([]) // appTypes
			.mockReturnValueOnce(''); // splitField

		const mockAnalyticsResponse: AnalyticsResponse = {};
		const mockTransformedAnalytics = {};

		mockApiClient.getBoardAnalytics.mockResolvedValue(mockAnalyticsResponse);
		(DataTransformer.transformAnalyticsResponse as jest.Mock).mockReturnValue(
			mockTransformedAnalytics,
		);

		// Act
		const result = await getBoardAnalytics.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(result.json).toEqual({
			...mockTransformedAnalytics,
			requestParams: {
				boardId: 'board123',
				startDate: '2024-01-01',
				endDate: '2024-01-31',
				metricTypes: null,
				appTypes: null,
				splitField: null,
			},
		});
	});
});
