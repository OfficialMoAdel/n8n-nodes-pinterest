import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createBoard } from '../create.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { BoardResponse } from '../../../utils/types';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer', () => ({
	DataTransformer: {
		transformBoardResponse: jest.fn(),
	},
}));

import { DataTransformer } from '../../../utils/DataTransformer';

describe('Board Create Operation', () => {
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
			createBoard: jest.fn(),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('successful board creation', () => {
		it('should create board with required parameters', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Test Board',
				description: 'Test Description',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/test',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			const mockTransformedData = {
				boardId: 'board123',
				name: 'Test Board',
				description: 'Test Description',
				privacy: 'public',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Test Board') // name
				.mockReturnValueOnce('Test Description') // description
				.mockReturnValueOnce('public'); // privacy

			mockApiClient.createBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue(mockTransformedData);

			// Act
			const result = await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('name', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('description', 0, '');
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('privacy', 0, 'public');

			expect(mockApiClient.createBoard).toHaveBeenCalledWith({
				name: 'Test Board',
				description: 'Test Description',
				privacy: 'public',
			});

			expect(DataTransformer.transformBoardResponse).toHaveBeenCalledWith(mockBoardResponse);

			expect(result).toEqual({
				json: mockTransformedData,
				pairedItem: { item: 0 },
			});
		});

		it('should create board with minimal parameters (name only)', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Minimal Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/minimal',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			const mockTransformedData = {
				boardId: 'board123',
				name: 'Minimal Board',
				privacy: 'public',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Minimal Board') // name
				.mockReturnValueOnce('') // description (empty)
				.mockReturnValueOnce('public'); // privacy

			mockApiClient.createBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue(mockTransformedData);

			// Act
			const result = await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.createBoard).toHaveBeenCalledWith({
				name: 'Minimal Board',
				privacy: 'public',
			});

			expect(result).toEqual({
				json: mockTransformedData,
				pairedItem: { item: 0 },
			});
		});

		it('should handle different privacy settings', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Secret Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/secret',
				privacy: 'secret',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Secret Board') // name
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('secret'); // privacy

			mockApiClient.createBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.createBoard).toHaveBeenCalledWith({
				name: 'Secret Board',
				privacy: 'secret',
			});
		});

		it('should trim whitespace from name and description', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Trimmed Board',
				description: 'Trimmed Description',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/trimmed',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('  Trimmed Board  ') // name with whitespace
				.mockReturnValueOnce('  Trimmed Description  ') // description with whitespace
				.mockReturnValueOnce('public'); // privacy

			mockApiClient.createBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.createBoard).toHaveBeenCalledWith({
				name: 'Trimmed Board',
				description: 'Trimmed Description',
				privacy: 'public',
			});
		});
	});

	describe('validation errors', () => {
		it('should throw error when name is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // empty name
				.mockReturnValueOnce('Description')
				.mockReturnValueOnce('public');

			// Act & Assert
			await expect(createBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.createBoard).not.toHaveBeenCalled();
		});

		it('should throw error when name is only whitespace', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('   ') // whitespace only name
				.mockReturnValueOnce('Description')
				.mockReturnValueOnce('public');

			// Act & Assert
			await expect(createBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.createBoard).not.toHaveBeenCalled();
		});

		it('should throw error for invalid privacy setting', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Valid Board Name')
				.mockReturnValueOnce('Description')
				.mockReturnValueOnce('invalid_privacy'); // invalid privacy

			// Act & Assert
			await expect(createBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);

			expect(mockApiClient.createBoard).not.toHaveBeenCalled();
		});
	});

	describe('API errors', () => {
		it('should handle API client errors', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Test Board')
				.mockReturnValueOnce('Description')
				.mockReturnValueOnce('public');

			const apiError = new Error('API Error');
			mockApiClient.createBoard.mockRejectedValue(apiError);

			// Act & Assert
			await expect(createBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should re-throw NodeOperationError without wrapping', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Test Board')
				.mockReturnValueOnce('Description')
				.mockReturnValueOnce('public');

			const nodeError = new NodeOperationError(mockNode, 'Specific API error');
			mockApiClient.createBoard.mockRejectedValue(nodeError);

			// Act & Assert
			await expect(createBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Specific API error',
			);
		});
	});

	describe('edge cases', () => {
		it('should handle empty description correctly', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'No Description Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/no-desc',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('No Description Board')
				.mockReturnValueOnce('') // empty description
				.mockReturnValueOnce('public');

			mockApiClient.createBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert - description should not be included in request
			expect(mockApiClient.createBoard).toHaveBeenCalledWith({
				name: 'No Description Board',
				privacy: 'public',
			});
		});

		it('should handle whitespace-only description correctly', async () => {
			// Arrange
			const mockBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'Whitespace Description Board',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/whitespace',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Whitespace Description Board')
				.mockReturnValueOnce('   ') // whitespace-only description
				.mockReturnValueOnce('public');

			mockApiClient.createBoard.mockResolvedValue(mockBoardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			// Act
			await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert - description should not be included in request
			expect(mockApiClient.createBoard).toHaveBeenCalledWith({
				name: 'Whitespace Description Board',
				privacy: 'public',
			});
		});
	});
});
