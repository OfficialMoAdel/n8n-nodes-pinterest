import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { searchBoards } from '../boards.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { SearchBoardsResponse } from '../../../utils/types';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer', () => ({
	DataTransformer: {
		transformBoardResponse: jest.fn((board) => ({
			boardId: board.id,
			name: board.name,
			description: board.description,
			url: board.url,
			privacy: board.privacy,
			pinCount: board.pin_count,
		})),
	},
}));

describe('Pinterest Search Boards Operation', () => {
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
			searchBoards: jest.fn(),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('successful board search', () => {
		it('should search boards with basic parameters', async () => {
			// Arrange
			const mockResponse: SearchBoardsResponse = {
				items: [
					{
						id: 'board1',
						name: 'Test Board 1',
						description: 'Test description 1',
						url: 'https://pinterest.com/board1',
						privacy: 'public',
						pin_count: 25,
						follower_count: 100,
						created_at: '2023-01-01T00:00:00Z',
					},
					{
						id: 'board2',
						name: 'Test Board 2',
						description: 'Test description 2',
						url: 'https://pinterest.com/board2',
						privacy: 'private',
						pin_count: 50,
						follower_count: 200,
						created_at: '2023-01-02T00:00:00Z',
					},
				],
				bookmark: 'next_page_token',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce(''); // bookmark

			mockApiClient.searchBoards.mockResolvedValue(mockResponse);

			// Act
			const result = await searchBoards.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchBoards).toHaveBeenCalledWith({
				query: 'test query',
				limit: 25,
			});

			expect(result).toHaveLength(3); // 1 metadata + 2 boards
			expect(result[0].json).toEqual({
				searchQuery: 'test query',
				totalResults: 2,
				bookmark: 'next_page_token',
				hasMore: true,
			});

			expect(result[1].json).toEqual({
				boardId: 'board1',
				name: 'Test Board 1',
				description: 'Test description 1',
				url: 'https://pinterest.com/board1',
				privacy: 'public',
				pinCount: 25,
			});
		});

		it('should search boards with pagination bookmark', async () => {
			// Arrange
			const mockResponse: SearchBoardsResponse = {
				items: [],
				bookmark: undefined,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('paginated query') // query
				.mockReturnValueOnce(50) // limit
				.mockReturnValueOnce('bookmark123'); // bookmark

			mockApiClient.searchBoards.mockResolvedValue(mockResponse);

			// Act
			const result = await searchBoards.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchBoards).toHaveBeenCalledWith({
				query: 'paginated query',
				limit: 50,
				bookmark: 'bookmark123',
			});

			expect(result).toHaveLength(1); // Only metadata
			expect(result[0].json).toEqual({
				searchQuery: 'paginated query',
				totalResults: 0,
				bookmark: undefined,
				hasMore: false,
			});
		});

		it('should handle empty search results', async () => {
			// Arrange
			const mockResponse: SearchBoardsResponse = {
				items: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('no results query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce(''); // bookmark

			mockApiClient.searchBoards.mockResolvedValue(mockResponse);

			// Act
			const result = await searchBoards.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({
				searchQuery: 'no results query',
				totalResults: 0,
				bookmark: undefined,
				hasMore: false,
			});
		});
	});

	describe('parameter validation', () => {
		it('should throw error for empty query', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); // empty query

			// Act & Assert
			await expect(searchBoards.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for whitespace-only query', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('   '); // whitespace query

			// Act & Assert
			await expect(searchBoards.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for limit below 1', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('valid query') // query
				.mockReturnValueOnce(0); // invalid limit

			// Act & Assert
			await expect(searchBoards.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for limit above 250', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('valid query') // query
				.mockReturnValueOnce(251); // invalid limit

			// Act & Assert
			await expect(searchBoards.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should trim whitespace from query', async () => {
			// Arrange
			const mockResponse: SearchBoardsResponse = {
				items: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('  trimmed query  ') // query with whitespace
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce(''); // bookmark

			mockApiClient.searchBoards.mockResolvedValue(mockResponse);

			// Act
			await searchBoards.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchBoards).toHaveBeenCalledWith({
				query: 'trimmed query',
				limit: 25,
			});
		});
	});

	describe('error handling', () => {
		it('should handle API errors gracefully', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce(''); // bookmark

			const apiError = new Error('Pinterest API Error');
			mockApiClient.searchBoards.mockRejectedValue(apiError);

			// Act & Assert
			await expect(searchBoards.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should re-throw NodeOperationError without wrapping', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); // empty query

			// Act & Assert
			await expect(searchBoards.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('pagination support', () => {
		it('should include bookmark in search parameters when provided', async () => {
			// Arrange
			const mockResponse: SearchBoardsResponse = {
				items: [],
				bookmark: 'next_token',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('current_token'); // bookmark

			mockApiClient.searchBoards.mockResolvedValue(mockResponse);

			// Act
			await searchBoards.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchBoards).toHaveBeenCalledWith({
				query: 'test query',
				limit: 25,
				bookmark: 'current_token',
			});
		});

		it('should not include bookmark when empty string provided', async () => {
			// Arrange
			const mockResponse: SearchBoardsResponse = {
				items: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce(''); // empty bookmark

			mockApiClient.searchBoards.mockResolvedValue(mockResponse);

			// Act
			await searchBoards.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchBoards).toHaveBeenCalledWith({
				query: 'test query',
				limit: 25,
			});
		});
	});

	describe('metadata filtering', () => {
		it('should return boards with complete metadata', async () => {
			// Arrange
			const mockResponse: SearchBoardsResponse = {
				items: [
					{
						id: 'board1',
						name: 'Complete Board',
						description: 'Full description',
						url: 'https://pinterest.com/board1',
						privacy: 'public',
						pin_count: 100,
						follower_count: 500,
						created_at: '2023-01-01T00:00:00Z',
						owner: {
							username: 'testuser',
						},
						cover_pin: {
							id: 'pin123',
							url: 'https://pinterest.com/pin/pin123',
						},
					},
				],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('metadata query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce(''); // bookmark

			mockApiClient.searchBoards.mockResolvedValue(mockResponse);

			// Act
			const result = await searchBoards.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result).toHaveLength(2); // 1 metadata + 1 board
			expect(result[1].json).toEqual({
				boardId: 'board1',
				name: 'Complete Board',
				description: 'Full description',
				url: 'https://pinterest.com/board1',
				privacy: 'public',
				pinCount: 100,
			});
		});
	});
});
