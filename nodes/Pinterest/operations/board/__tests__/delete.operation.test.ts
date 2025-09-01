import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { deleteBoard } from '../delete.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { BoardResponse } from '../../../utils/types';

describe('Board Delete Operation', () => {
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
			deleteBoard: jest.fn(),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('successful board deletion', () => {
		it('should delete board with confirmation', async () => {
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
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce(true); // confirmDeletion

			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			mockApiClient.deleteBoard.mockResolvedValue();

			// Mock Date.now() for consistent testing
			const mockDate = '2023-01-01T12:00:00.000Z';
			jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

			// Act
			const result = await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('boardId', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'confirmDeletion',
				0,
				false,
			);
			expect(mockApiClient.getBoard).toHaveBeenCalledWith('board123');
			expect(mockApiClient.deleteBoard).toHaveBeenCalledWith('board123');

			expect(result).toEqual({
				json: {
					success: true,
					boardId: 'board123',
					boardName: 'Test Board',
					message: 'Board "Test Board" has been successfully deleted',
					deletedAt: mockDate,
					pinCount: 5,
					warning: 'This board contained 5 pins which have also been deleted',
				},
				pairedItem: { item: 0 },
			});
		});

		it('should delete board with no pins', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board456',
				name: 'Empty Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/empty',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board456')
				.mockReturnValueOnce(true);

			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			mockApiClient.deleteBoard.mockResolvedValue();

			const mockDate = '2023-01-01T12:00:00.000Z';
			jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

			// Act
			const result = await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result.json).toEqual({
				success: true,
				boardId: 'board456',
				boardName: 'Empty Board',
				message: 'Board "Empty Board" has been successfully deleted',
				deletedAt: mockDate,
				pinCount: 0,
				warning: undefined, // No warning for empty board
			});
		});

		it('should handle board that does not exist (404 error)', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('nonexistent123')
				.mockReturnValueOnce(true);

			const notFoundError = new Error('Board not found - 404');
			mockApiClient.getBoard.mockRejectedValue(notFoundError);

			const mockDate = '2023-01-01T12:00:00.000Z';
			jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

			// Act
			const result = await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getBoard).toHaveBeenCalledWith('nonexistent123');
			expect(mockApiClient.deleteBoard).not.toHaveBeenCalled(); // Should not attempt deletion

			expect(result).toEqual({
				json: {
					success: true,
					boardId: 'nonexistent123',
					message: 'Board not found (may have been already deleted)',
					deletedAt: mockDate,
				},
				pairedItem: { item: 0 },
			});
		});

		it('should handle "Not Found" error message', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('nonexistent456')
				.mockReturnValueOnce(true);

			const notFoundError = new Error('Not Found');
			mockApiClient.getBoard.mockRejectedValue(notFoundError);

			const mockDate = '2023-01-01T12:00:00.000Z';
			jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

			// Act
			const result = await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result.json.message).toBe('Board not found (may have been already deleted)');
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

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('  board789  ') // with whitespace
				.mockReturnValueOnce(true);

			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			mockApiClient.deleteBoard.mockResolvedValue();

			// Act
			await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.getBoard).toHaveBeenCalledWith('board789'); // trimmed
			expect(mockApiClient.deleteBoard).toHaveBeenCalledWith('board789'); // trimmed
		});
	});

	describe('validation errors', () => {
		it('should throw error when board ID is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // empty boardId
				.mockReturnValueOnce(true);

			// Act & Assert
			await expect(deleteBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).not.toHaveBeenCalled();
			expect(mockApiClient.deleteBoard).not.toHaveBeenCalled();
		});

		it('should throw error when board ID is only whitespace', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('   ') // whitespace only
				.mockReturnValueOnce(true);

			// Act & Assert
			await expect(deleteBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).not.toHaveBeenCalled();
			expect(mockApiClient.deleteBoard).not.toHaveBeenCalled();
		});

		it('should throw error when confirmation is false', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce(false); // confirmDeletion = false

			// Act & Assert
			await expect(deleteBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).not.toHaveBeenCalled();
			expect(mockApiClient.deleteBoard).not.toHaveBeenCalled();
		});

		it('should throw error when confirmation is not provided (default false)', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce(false); // default value

			// Act & Assert
			await expect(deleteBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).not.toHaveBeenCalled();
			expect(mockApiClient.deleteBoard).not.toHaveBeenCalled();
		});
	});

	describe('API errors', () => {
		it('should handle authentication errors during board retrieval', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce(true);

			const authError = new Error('Authentication failed');
			mockApiClient.getBoard.mockRejectedValue(authError);

			// Act & Assert
			await expect(deleteBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.deleteBoard).not.toHaveBeenCalled();
		});

		it('should handle API errors during deletion', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Test Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/test',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce(true);

			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);

			const deleteError = new Error('Deletion failed');
			mockApiClient.deleteBoard.mockRejectedValue(deleteError);

			// Act & Assert
			await expect(deleteBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).toHaveBeenCalled();
			expect(mockApiClient.deleteBoard).toHaveBeenCalled();
		});

		it('should re-throw NodeOperationError without wrapping', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce(true);

			const nodeError = new NodeOperationError(mockNode, 'Specific API error');
			mockApiClient.getBoard.mockRejectedValue(nodeError);

			// Act & Assert
			await expect(deleteBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Specific API error',
			);
		});

		it('should handle network errors', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce(true);

			const networkError = new Error('Network timeout');
			mockApiClient.getBoard.mockRejectedValue(networkError);

			// Act & Assert
			await expect(deleteBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('edge cases', () => {
		it('should handle board with many pins', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Popular Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/popular',
				privacy: 'public',
				pin_count: 1000,
				follower_count: 500,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce(true);

			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			mockApiClient.deleteBoard.mockResolvedValue();

			const mockDate = '2023-01-01T12:00:00.000Z';
			jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

			// Act
			const result = await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result.json.warning).toBe(
				'This board contained 1000 pins which have also been deleted',
			);
			expect(result.json.pinCount).toBe(1000);
		});

		it('should handle board with special characters in name', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Special & "Quoted" Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/special',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce(true);

			mockApiClient.getBoard.mockResolvedValue(mockBoardResponse);
			mockApiClient.deleteBoard.mockResolvedValue();

			// Act
			const result = await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result.json.boardName).toBe('Special & "Quoted" Board');
			expect(result.json.message).toBe(
				'Board "Special & "Quoted" Board" has been successfully deleted',
			);
		});

		it('should handle null or undefined board ID', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(null) // null boardId
				.mockReturnValueOnce(true);

			// Act & Assert
			await expect(deleteBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.getBoard).not.toHaveBeenCalled();
			expect(mockApiClient.deleteBoard).not.toHaveBeenCalled();
		});
	});

	afterEach(() => {
		// Restore Date mock
		jest.restoreAllMocks();
	});
});
