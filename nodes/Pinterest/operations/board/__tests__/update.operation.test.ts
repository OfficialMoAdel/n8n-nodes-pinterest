import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updateBoard } from '../update.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { BoardResponse, UpdateBoardRequest } from '../../../utils/types';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer', () => ({
	DataTransformer: {
		transformBoardResponse: jest.fn(),
	},
}));

import { DataTransformer } from '../../../utils/DataTransformer';

describe('Board Update Operation', () => {
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
			updateBoard: jest.fn(),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('successful board updates', () => {
		it('should update board with all parameters', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Updated Board',
				description: 'Updated Description',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/updated',
				privacy: 'protected',
				pin_count: 5,
				follower_count: 10,
			};

			const mockTransformedData = {
				boardId: 'board123',
				name: 'Updated Board',
				description: 'Updated Description',
				privacy: 'protected',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('Updated Board') // name
				.mockReturnValueOnce('Updated Description') // description
				.mockReturnValueOnce('protected'); // privacy

			mockApiClient.updateBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue(mockTransformedData);

			// Act
			const result = await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('boardId', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('name', 0, '');
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('description', 0, '');
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('privacy', 0, '');

			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board123', {
				name: 'Updated Board',
				description: 'Updated Description',
				privacy: 'protected',
			});

			expect(DataTransformer.transformBoardResponse).toHaveBeenCalledWith(mockBoardResponse);

			expect(result).toEqual({
				json: mockTransformedData,
				pairedItem: { item: 0 },
			});
		});

		it('should update board with only name', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'New Name Only',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/new-name',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('New Name Only') // name
				.mockReturnValueOnce('') // description (empty)
				.mockReturnValueOnce(''); // privacy (empty)

			mockApiClient.updateBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board123', {
				name: 'New Name Only',
			});
		});

		it('should update board with only description', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Existing Name',
				description: 'New Description Only',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/desc-only',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('') // name (empty)
				.mockReturnValueOnce('New Description Only') // description
				.mockReturnValueOnce(''); // privacy (empty)

			mockApiClient.updateBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board123', {
				description: 'New Description Only',
			});
		});

		it('should update board with only privacy', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Existing Name',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/privacy-only',
				privacy: 'secret',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('') // name (empty)
				.mockReturnValueOnce('') // description (empty)
				.mockReturnValueOnce('secret'); // privacy

			mockApiClient.updateBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board123', {
				privacy: 'secret',
			});
		});

		it('should trim whitespace from all fields', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Trimmed Name',
				description: 'Trimmed Description',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/trimmed',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('  board123  ') // boardId with whitespace
				.mockReturnValueOnce('  Trimmed Name  ') // name with whitespace
				.mockReturnValueOnce('  Trimmed Description  ') // description with whitespace
				.mockReturnValueOnce('  public  '); // privacy with whitespace

			mockApiClient.updateBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board123', {
				name: 'Trimmed Name',
				description: 'Trimmed Description',
				privacy: 'public',
			});
		});
	});

	describe('validation errors', () => {
		it('should throw error when board ID is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // empty boardId
				.mockReturnValueOnce('Name')
				.mockReturnValueOnce('Description')
				.mockReturnValueOnce('public');

			// Act & Assert
			await expect(updateBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.updateBoard).not.toHaveBeenCalled();
		});

		it('should throw error when board ID is only whitespace', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('   ') // whitespace only boardId
				.mockReturnValueOnce('Name')
				.mockReturnValueOnce('Description')
				.mockReturnValueOnce('public');

			// Act & Assert
			await expect(updateBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.updateBoard).not.toHaveBeenCalled();
		});

		it('should throw error when no fields are provided for update', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // valid boardId
				.mockReturnValueOnce('') // empty name
				.mockReturnValueOnce('') // empty description
				.mockReturnValueOnce(''); // empty privacy

			// Act & Assert
			await expect(updateBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.updateBoard).not.toHaveBeenCalled();
		});

		it('should throw error when all fields are only whitespace', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // valid boardId
				.mockReturnValueOnce('   ') // whitespace name
				.mockReturnValueOnce('   ') // whitespace description
				.mockReturnValueOnce('   '); // whitespace privacy

			// Act & Assert
			await expect(updateBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.updateBoard).not.toHaveBeenCalled();
		});

		it('should throw error for invalid privacy setting', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce('') // empty name
				.mockReturnValueOnce('') // empty description
				.mockReturnValueOnce('invalid_privacy'); // invalid privacy

			// Act & Assert
			await expect(updateBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.updateBoard).not.toHaveBeenCalled();
		});
	});

	describe('privacy validation', () => {
		it('should accept valid privacy settings', async () => {
			const validPrivacySettings = ['public', 'protected', 'secret'];

			for (const privacy of validPrivacySettings) {
				// Arrange
				const mockBoardResponse: BoardResponse = {
					id: 'board123',
					name: 'Test Board',
					created_at: '2023-01-01T00:00:00Z',
					url: 'https://pinterest.com/board/test',
					privacy: privacy as any,
					pin_count: 0,
					follower_count: 0,
				};

				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('board123')
					.mockReturnValueOnce('') // empty name
					.mockReturnValueOnce('') // empty description
					.mockReturnValueOnce(privacy);

				mockApiClient.updateBoard.mockResolvedValue(mockBoardResponse);
				(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

				// Act
				await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

				// Assert
				expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board123', {
					privacy: privacy,
				});

				// Reset mocks for next iteration
				jest.clearAllMocks();
				mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			}
		});
	});

	describe('API errors', () => {
		it('should handle API client errors', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce('Updated Name')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('');

			const apiError = new Error('API Error');
			mockApiClient.updateBoard.mockRejectedValue(apiError);

			// Act & Assert
			await expect(updateBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should re-throw NodeOperationError without wrapping', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce('Updated Name')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('');

			const nodeError = new NodeOperationError(mockNode, 'Specific API error');
			mockApiClient.updateBoard.mockRejectedValue(nodeError);

			// Act & Assert
			await expect(updateBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Specific API error',
			);
		});

		it('should handle board not found error', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('nonexistent123')
				.mockReturnValueOnce('Updated Name')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('');

			const notFoundError = new Error('Board not found');
			mockApiClient.updateBoard.mockRejectedValue(notFoundError);

			// Act & Assert
			await expect(updateBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('edge cases', () => {
		it('should handle partial updates correctly', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Partial Update',
				description: 'New Description',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/partial',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce('Partial Update') // only name provided
				.mockReturnValueOnce('New Description') // only description provided
				.mockReturnValueOnce(''); // privacy empty

			mockApiClient.updateBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert - only name and description should be in update request
			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board123', {
				name: 'Partial Update',
				description: 'New Description',
			});
		});

		it('should handle mixed whitespace and valid values', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Valid Name',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/mixed',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123')
				.mockReturnValueOnce('Valid Name') // valid name
				.mockReturnValueOnce('   ') // whitespace description
				.mockReturnValueOnce(''); // empty privacy

			mockApiClient.updateBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert - only name should be in update request
			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board123', {
				name: 'Valid Name',
			});
		});
	});
});
