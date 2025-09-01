import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { searchPins } from '../pins.operation';
import { searchBoards } from '../boards.operation';
import { getTrending } from '../trending.operation';
import { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type {
	SearchPinsResponse,
	SearchBoardsResponse,
	TrendingResponse,
} from '../../../utils/types';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer', () => ({
	DataTransformer: {
		transformPinResponse: jest.fn((pin) => ({
			pinId: pin.id,
			title: pin.title,
			url: pin.url,
		})),
		transformBoardResponse: jest.fn((board) => ({
			boardId: board.id,
			name: board.name,
			url: board.url,
		})),
	},
}));

describe('Pinterest Search Operations Integration', () => {
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
			searchPins: jest.fn(),
			searchBoards: jest.fn(),
			getTrending: jest.fn(),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('search workflow integration', () => {
		it('should handle complete search workflow with pins and boards', async () => {
			// Arrange - Pin search
			const mockPinResponse: SearchPinsResponse = {
				items: [
					{
						id: 'pin1',
						title: 'Search Pin 1',
						url: 'https://pinterest.com/pin/pin1',
						created_at: '2023-01-01T00:00:00Z',
						board_id: 'board1',
						media: { url: 'https://i.pinimg.com/pin1.jpg', media_type: 'image' },
					},
				],
				bookmark: 'pin_bookmark',
			};

			// Arrange - Board search
			const mockBoardResponse: SearchBoardsResponse = {
				items: [
					{
						id: 'board1',
						name: 'Search Board 1',
						url: 'https://pinterest.com/board1',
						privacy: 'public',
						pin_count: 10,
						follower_count: 50,
						created_at: '2023-01-01T00:00:00Z',
					},
				],
				bookmark: 'board_bookmark',
			};

			// Mock pin search parameters
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValue(mockPinResponse);

			// Act - Pin search
			const pinResults = await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Mock board search parameters
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce(''); // bookmark

			mockApiClient.searchBoards.mockResolvedValue(mockBoardResponse);

			// Act - Board search
			const boardResults = await searchBoards.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(pinResults).toHaveLength(2); // metadata + 1 pin
			expect(boardResults).toHaveLength(2); // metadata + 1 board

			// Verify pin search results
			expect(pinResults[0].json).toEqual({
				searchQuery: 'test query',
				totalResults: 1,
				bookmark: 'pin_bookmark',
				hasMore: true,
			});

			expect(pinResults[1].json).toEqual({
				pinId: 'pin1',
				title: 'Search Pin 1',
				url: 'https://pinterest.com/pin/pin1',
			});

			// Verify board search results
			expect(boardResults[0].json).toEqual({
				searchQuery: 'test query',
				totalResults: 1,
				bookmark: 'board_bookmark',
				hasMore: true,
			});

			expect(boardResults[1].json).toEqual({
				boardId: 'board1',
				name: 'Search Board 1',
				url: 'https://pinterest.com/board1',
			});
		});

		it('should handle pagination across multiple search operations', async () => {
			// Arrange - First page
			const firstPageResponse: SearchPinsResponse = {
				items: [
					{
						id: 'pin1',
						title: 'Pin 1',
						url: 'https://pinterest.com/pin/pin1',
						created_at: '2023-01-01T00:00:00Z',
						board_id: 'board1',
						media: { url: 'https://i.pinimg.com/pin1.jpg', media_type: 'image' },
					},
				],
				bookmark: 'page2_token',
			};

			// Arrange - Second page
			const secondPageResponse: SearchPinsResponse = {
				items: [
					{
						id: 'pin2',
						title: 'Pin 2',
						url: 'https://pinterest.com/pin/pin2',
						created_at: '2023-01-02T00:00:00Z',
						board_id: 'board2',
						media: { url: 'https://i.pinimg.com/pin2.jpg', media_type: 'image' },
					},
				],
				bookmark: undefined, // No more pages
			};

			// First page search
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pagination test') // query
				.mockReturnValueOnce(1) // limit
				.mockReturnValueOnce('') // bookmark (first page)
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValueOnce(firstPageResponse);

			// Act - First page
			const firstPageResults = await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Second page search
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pagination test') // query
				.mockReturnValueOnce(1) // limit
				.mockReturnValueOnce('page2_token') // bookmark (second page)
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValueOnce(secondPageResponse);

			// Act - Second page
			const secondPageResults = await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(firstPageResults[0].json.hasMore).toBe(true);
			expect(firstPageResults[0].json.bookmark).toBe('page2_token');

			expect(secondPageResults[0].json.hasMore).toBe(false);
			expect(secondPageResults[0].json.bookmark).toBeUndefined();

			// Verify API was called with correct bookmarks
			expect(mockApiClient.searchPins).toHaveBeenNthCalledWith(1, {
				query: 'pagination test',
				limit: 1,
			});

			expect(mockApiClient.searchPins).toHaveBeenNthCalledWith(2, {
				query: 'pagination test',
				limit: 1,
				bookmark: 'page2_token',
			});
		});

		it('should handle trending content alongside search results', async () => {
			// Arrange - Trending
			const mockTrendingResponse: TrendingResponse = {
				trends: [
					{
						keyword: 'trending topic',
						pct_growth_wow: 50.0,
						pct_growth_yoy: 200.0,
					},
				],
			};

			// Arrange - Search based on trending
			const mockSearchResponse: SearchPinsResponse = {
				items: [
					{
						id: 'trending_pin',
						title: 'Trending Pin',
						url: 'https://pinterest.com/pin/trending_pin',
						created_at: '2023-01-01T00:00:00Z',
						board_id: 'trending_board',
						media: { url: 'https://i.pinimg.com/trending.jpg', media_type: 'image' },
					},
				],
			};

			// Mock trending parameters
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // region
				.mockReturnValueOnce([]); // trendingTypes

			mockApiClient.getTrending.mockResolvedValue(mockTrendingResponse);

			// Act - Get trending
			const trendingResults = await getTrending.call(mockExecuteFunctions, mockApiClient, 0);

			// Mock search parameters using trending keyword
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('trending topic') // query from trending
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValue(mockSearchResponse);

			// Act - Search using trending keyword
			const searchResults = await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(trendingResults).toHaveLength(2); // metadata + 1 trend
			expect(searchResults).toHaveLength(2); // metadata + 1 pin

			// Verify trending data
			expect(trendingResults[1].json.keyword).toBe('trending topic');
			expect(trendingResults[1].json.percentGrowthWeekOverWeek).toBe(50.0);

			// Verify search used trending keyword
			expect(mockApiClient.searchPins).toHaveBeenCalledWith({
				query: 'trending topic',
				limit: 25,
			});

			expect(searchResults[1].json.pinId).toBe('trending_pin');
		});
	});

	describe('error handling integration', () => {
		it('should handle mixed success and failure scenarios', async () => {
			// Arrange - Successful pin search
			const mockPinResponse: SearchPinsResponse = {
				items: [
					{
						id: 'pin1',
						title: 'Success Pin',
						url: 'https://pinterest.com/pin/pin1',
						created_at: '2023-01-01T00:00:00Z',
						board_id: 'board1',
						media: { url: 'https://i.pinimg.com/pin1.jpg', media_type: 'image' },
					},
				],
			};

			// Mock successful pin search
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('success query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValue(mockPinResponse);

			// Act - Successful pin search
			const pinResults = await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Mock failed board search
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // empty query (will fail)
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce(''); // bookmark

			// Act & Assert - Failed board search
			await expect(searchBoards.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow();

			// Verify successful operation still worked
			expect(pinResults).toHaveLength(2);
			expect(pinResults[1].json.pinId).toBe('pin1');
		});
	});

	describe('performance and rate limiting integration', () => {
		it('should handle multiple concurrent search operations', async () => {
			// Arrange
			const mockPinResponse: SearchPinsResponse = { items: [] };
			const mockBoardResponse: SearchBoardsResponse = { items: [] };
			const mockTrendingResponse: TrendingResponse = { trends: [] };

			// Mock all parameters for concurrent operations
			mockExecuteFunctions.getNodeParameter
				// Pin search parameters
				.mockReturnValueOnce('concurrent pins') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined) // isEligibleForRelatedProducts
				// Board search parameters
				.mockReturnValueOnce('concurrent boards') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // bookmark
				// Trending parameters
				.mockReturnValueOnce('') // region
				.mockReturnValueOnce([]); // trendingTypes

			mockApiClient.searchPins.mockResolvedValue(mockPinResponse);
			mockApiClient.searchBoards.mockResolvedValue(mockBoardResponse);
			mockApiClient.getTrending.mockResolvedValue(mockTrendingResponse);

			// Act - Execute operations concurrently
			const [pinResults, boardResults, trendingResults] = await Promise.all([
				searchPins.call(mockExecuteFunctions, mockApiClient, 0),
				searchBoards.call(mockExecuteFunctions, mockApiClient, 0),
				getTrending.call(mockExecuteFunctions, mockApiClient, 0),
			]);

			// Assert
			expect(pinResults).toHaveLength(1); // Only metadata
			expect(boardResults).toHaveLength(1); // Only metadata
			expect(trendingResults).toHaveLength(1); // Only metadata

			// Verify all API calls were made
			expect(mockApiClient.searchPins).toHaveBeenCalledTimes(1);
			expect(mockApiClient.searchBoards).toHaveBeenCalledTimes(1);
			expect(mockApiClient.getTrending).toHaveBeenCalledTimes(1);
		});
	});
});
