import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getTrending } from '../trending.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { TrendingResponse } from '../../../utils/types';

describe('Pinterest Get Trending Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockApiClient: jest.Mocked<PinterestApiClient>;
	let mockNode: any;

	beforeEach(() => {
		mockNode = {
			name: 'Pinterest',
			type: 'n8n-nodes-pinterest.pinterest',
		};

		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue(mockNode),
		} as any;

		mockApiClient = {
			getTrending: jest.fn(),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('successful trending retrieval', () => {
		it('should get trending content with no parameters', async () => {
			// Arrange
			const mockResponse: TrendingResponse = {
				trends: [
					{
						keyword: 'summer fashion',
						pct_growth_wow: 25.5,
						pct_growth_yoy: 150.2,
						time_series: [
							{ date: '2023-01-01', value: 100 },
							{ date: '2023-01-02', value: 125 },
						],
					},
					{
						keyword: 'home decor',
						pct_growth_wow: 15.3,
						pct_growth_yoy: 75.8,
						time_series: [
							{ date: '2023-01-01', value: 200 },
							{ date: '2023-01-02', value: 230 },
						],
					},
				],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // region
				.mockReturnValueOnce([]); // trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockResponse);

			// Act
			const result = await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getTrending).toHaveBeenCalledWith({});

			expect(result).toHaveLength(3); // 1 metadata + 2 trends
			expect(result[0].json).toEqual({
				region: 'global',
				trendingTypes: [],
				totalTrends: 2,
				retrievedAt: expect.any(String),
			});

			expect(result[1].json).toEqual({
				keyword: 'summer fashion',
				percentGrowthWeekOverWeek: 25.5,
				percentGrowthYearOverYear: 150.2,
				timeSeries: [
					{ date: '2023-01-01', value: 100 },
					{ date: '2023-01-02', value: 125 },
				],
				trendIndex: 1,
			});

			expect(result[2].json).toEqual({
				keyword: 'home decor',
				percentGrowthWeekOverWeek: 15.3,
				percentGrowthYearOverYear: 75.8,
				timeSeries: [
					{ date: '2023-01-01', value: 200 },
					{ date: '2023-01-02', value: 230 },
				],
				trendIndex: 2,
			});
		});

		it('should get trending content with region and types', async () => {
			// Arrange
			const mockResponse: TrendingResponse = {
				trends: [
					{
						keyword: 'regional trend',
						pct_growth_wow: 30.0,
						pct_growth_yoy: 200.0,
					},
				],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('US') // region
				.mockReturnValueOnce(['pins', 'boards']); // trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockResponse);

			// Act
			const result = await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getTrending).toHaveBeenCalledWith({
				region: 'US',
				trending_types: ['pins', 'boards'],
			});

			expect(result).toHaveLength(2); // 1 metadata + 1 trend
			expect(result[0].json).toEqual({
				region: 'US',
				trendingTypes: ['pins', 'boards'],
				totalTrends: 1,
				retrievedAt: expect.any(String),
			});

			expect(result[1].json).toEqual({
				keyword: 'regional trend',
				percentGrowthWeekOverWeek: 30.0,
				percentGrowthYearOverYear: 200.0,
				timeSeries: undefined,
				trendIndex: 1,
			});
		});

		it('should handle empty trending results', async () => {
			// Arrange
			const mockResponse: TrendingResponse = {
				trends: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // region
				.mockReturnValueOnce([]); // trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockResponse);

			// Act
			const result = await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result).toHaveLength(1); // Only metadata
			expect(result[0].json).toEqual({
				region: 'global',
				trendingTypes: [],
				totalTrends: 0,
				retrievedAt: expect.any(String),
			});
		});

		it('should handle trends without optional fields', async () => {
			// Arrange
			const mockResponse: TrendingResponse = {
				trends: [
					{
						keyword: 'minimal trend',
					},
				],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // region
				.mockReturnValueOnce([]); // trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockResponse);

			// Act
			const result = await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result).toHaveLength(2); // 1 metadata + 1 trend
			expect(result[1].json).toEqual({
				keyword: 'minimal trend',
				percentGrowthWeekOverWeek: undefined,
				percentGrowthYearOverYear: undefined,
				timeSeries: undefined,
				trendIndex: 1,
			});
		});
	});

	describe('parameter handling', () => {
		it('should trim whitespace from region parameter', async () => {
			// Arrange
			const mockResponse: TrendingResponse = {
				trends: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('  GB  ') // region with whitespace
				.mockReturnValueOnce([]); // trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockResponse);

			// Act
			await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getTrending).toHaveBeenCalledWith({
				region: 'GB',
			});
		});

		it('should not include region when empty string provided', async () => {
			// Arrange
			const mockResponse: TrendingResponse = {
				trends: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // empty region
				.mockReturnValueOnce(['pins']); // trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockResponse);

			// Act
			await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getTrending).toHaveBeenCalledWith({
				trending_types: ['pins'],
			});
		});

		it('should not include trending types when empty array provided', async () => {
			// Arrange
			const mockResponse: TrendingResponse = {
				trends: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('US') // region
				.mockReturnValueOnce([]); // empty trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockResponse);

			// Act
			await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getTrending).toHaveBeenCalledWith({
				region: 'US',
			});
		});
	});

	describe('error handling', () => {
		it('should handle API errors gracefully', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // region
				.mockReturnValueOnce([]); // trendingTypes

			const apiError = new Error('Pinterest API Error');
			mockApiClient.getTrending.mockRejectedValue(apiError);

			// Act & Assert
			await expect(getTrending.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should re-throw NodeOperationError without wrapping', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // region
				.mockReturnValueOnce([]); // trendingTypes

			const nodeError = new NodeOperationError(mockNode, 'Test error');
			mockApiClient.getTrending.mockRejectedValue(nodeError);

			// Act & Assert
			await expect(getTrending.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('data transformation', () => {
		it('should properly transform trending data with all fields', async () => {
			// Arrange
			const mockResponse: TrendingResponse = {
				trends: [
					{
						keyword: 'complete trend',
						pct_growth_wow: 45.7,
						pct_growth_yoy: 123.4,
						time_series: [
							{ date: '2023-01-01', value: 50 },
							{ date: '2023-01-02', value: 75 },
							{ date: '2023-01-03', value: 100 },
						],
					},
				],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // region
				.mockReturnValueOnce([]); // trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockResponse);

			// Act
			const result = await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result[1].json).toEqual({
				keyword: 'complete trend',
				percentGrowthWeekOverWeek: 45.7,
				percentGrowthYearOverYear: 123.4,
				timeSeries: [
					{ date: '2023-01-01', value: 50 },
					{ date: '2023-01-02', value: 75 },
					{ date: '2023-01-03', value: 100 },
				],
				trendIndex: 1,
			});
		});

		it('should include retrievedAt timestamp in metadata', async () => {
			// Arrange
			const mockResponse: TrendingResponse = {
				trends: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // region
				.mockReturnValueOnce([]); // trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockResponse);

			const beforeCall = new Date().toISOString();

			// Act
			const result = await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			const afterCall = new Date().toISOString();
			const retrievedAt = result[0].json.retrievedAt as string;

			expect(retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(retrievedAt >= beforeCall).toBe(true);
			expect(retrievedAt <= afterCall).toBe(true);
		});
	});
});
