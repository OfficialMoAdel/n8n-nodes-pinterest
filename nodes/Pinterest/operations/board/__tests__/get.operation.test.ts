import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getBoard } from '../get.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { BoardResponse } from '../../../utils/types';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer', () => ({
	DataTransformer: {
		transformBoardResponse: jest.fn(),
	},
}));

import { DataTransformer } from '../../../utils/DataTransformer';

describe('Board Get Operation', () => {
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
			getBoard: jest.fn(),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('successful board retrieval', () => {
		it('should retrieve board with valid board ID', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Test Board',
				description: 'Test Description',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/test',
				privacy: 'public',
				pin_count: 5,
				follower_count: 10,
				owner: {
					username: 'testuser',
				},
				cover_pin: {
					id: 'pin123',
					url: 'https://pinterest.com/pin/123',
				},
			};

			const mockTransformedData = {
				boardId: 'board123',
				name: 'Test Board',
				description: 'Test Description',
				privacy: 'public',
				pinCount: 5,
				followerCount: 10,
				ownerUsername: 'testuser',
				coverPinId: 'pin123',
				coverPinUrl: 'https://pinterest.com/pin/123',
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('board123');
			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue(mockTransformedData);

			// Act
			const result = await getBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('boardId', 0);
			expect(mockApiClient.getBoard).toHaveBeenCalledWith('board123');
			expect(DataTransformer.transformBoardResponse).toHaveBeenCalledWith(mockBoardResponse);

			expect(result).toEqual({
				json: mockTransformedData,
				pairedItem: { item: 0 },
			});
		});

		it('should handle board with minimal data', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board456',
				name: 'Minimal Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/minimal',
				privacy: 'private',
				pin_count: 0,
				follower_count: 0,
			};

			const mockTransformedData = {
				boardId: 'board456',
				name: 'Minimal Board',
				privacy: 'private',
				pinCount: 0,
				followerCount: 0,
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('board456');
			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue(mockTransformedData);

			// Act
			const result = await getBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getBoard).toHaveBeenCalledWith('board456');
			expect(result.json).toEqual(mockTransformedData);
		});

		it('should trim whitespace from board ID', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board789',
				name: 'Trimmed Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/trimmed',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('  board789  '); // with whitespace
			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await getBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getBoard).toHaveBeenCalledWith('board789'); // trimmed
		});
	});

	describe('validation errors', () => {
		it('should throw error when board ID is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('');

			// Act & Assert
			await expect(getBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).not.toHaveBeenCalled();
		});

		it('should throw error when board ID is only whitespace', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('   ');

			// Act & Assert
			await expect(getBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).not.toHaveBeenCalled();
		});

		it('should throw error when board ID is null or undefined', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(null);

			// Act & Assert
			await expect(getBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).not.toHaveBeenCalled();
		});
	});

	describe('API errors', () => {
		it('should handle board not found error', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('nonexistent123');

			const apiError = new Error('Board not found');
			mockApiClient.getBoard.mockRejectedValue(apiError);

			// Act & Assert
			await expect(getBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).toHaveBeenCalledWith('nonexistent123');
		});

		it('should handle authentication errors', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('board123');

			const authError = new Error('Authentication failed');
			mockApiClient.getBoard.mockRejectedValue(authError);

			// Act & Assert
			await expect(getBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle network errors', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('board123');

			const networkError = new Error('Network timeout');
			mockApiClient.getBoard.mockRejectedValue(networkError);

			// Act & Assert
			await expect(getBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should re-throw NodeOperationError without wrapping', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('board123');

			const nodeError = new NodeOperationError(mockNode, 'Specific API error');
			mockApiClient.getBoard.mockRejectedValue(nodeError);

			// Act & Assert
			await expect(getBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Specific API error',
			);
		});
	});

	describe('different board types', () => {
		it('should handle public board', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'public123',
				name: 'Public Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/public',
				privacy: 'public',
				pin_count: 100,
				follower_count: 50,
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('public123');
			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await getBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getBoard).toHaveBeenCalledWith('public123');
			expect(DataTransformer.transformBoardResponse).toHaveBeenCalledWith(mockBoardResponse);
		});

		it('should handle secret board', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'secret123',
				name: 'Secret Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/secret',
				privacy: 'secret',
				pin_count: 5,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('secret123');
			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await getBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getBoard).toHaveBeenCalledWith('secret123');
			expect(DataTransformer.transformBoardResponse).toHaveBeenCalledWith(mockBoardResponse);
		});

		it('should handle board with no pins', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'empty123',
				name: 'Empty Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/empty',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('empty123');
			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await getBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getBoard).toHaveBeenCalledWith('empty123');
			expect(DataTransformer.transformBoardResponse).toHaveBeenCalledWith(mockBoardResponse);
		});
	});
});
