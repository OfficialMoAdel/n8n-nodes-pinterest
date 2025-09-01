import type { IExecuteFunctions } from 'n8n-workflow';
import { createBoard } from '../create.operation';
import { getBoard } from '../get.operation';
import { updateBoard } from '../update.operation';
import { deleteBoard } from '../delete.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { BoardResponse } from '../../../utils/types';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer', () => ({
	DataTransformer: {
		transformBoardResponse: jest.fn(),
	},
}));

import { DataTransformer } from '../../../utils/DataTransformer';

describe('Board Lifecycle Management', () => {
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
			getBoard: jest.fn(),
			updateBoard: jest.fn(),
			deleteBoard: jest.fn(),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('complete board lifecycle', () => {
		it('should handle full CRUD lifecycle for a board', async () => {
			// Mock board responses for different lifecycle stages
			const createdBoardResponse: BoardResponse = {
				id: 'board123',
				name: 'New Board',
				description: 'Initial description',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/new',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			const updatedBoardResponse: BoardResponse = {
				...createdBoardResponse,
				name: 'Updated Board',
				description: 'Updated description',
				privacy: 'protected',
			};

			const mockTransformedData = {
				boardId: 'board123',
				name: 'New Board',
				description: 'Initial description',
				privacy: 'public',
			};

			const mockUpdatedTransformedData = {
				boardId: 'board123',
				name: 'Updated Board',
				description: 'Updated description',
				privacy: 'protected',
			};

			// Setup mocks for DataTransformer
			(DataTransformer.transformBoardResponse as jest.Mock)
				.mockReturnValueOnce(mockTransformedData)
				.mockReturnValueOnce(mockTransformedData)
				.mockReturnValueOnce(mockUpdatedTransformedData);

			// 1. CREATE BOARD
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('New Board') // name
				.mockReturnValueOnce('Initial description') // description
				.mockReturnValueOnce('public'); // privacy

			mockApiClient.createBoard.mockResolvedValue(createdBoardResponse);

			const createResult = await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			expect(mockApiClient.createBoard).toHaveBeenCalledWith({
				name: 'New Board',
				description: 'Initial description',
				privacy: 'public',
			});
			expect(createResult.json).toEqual(mockTransformedData);

			// 2. GET BOARD
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('board123');
			mockApiClient.getBoard.mockResolvedValue(createdBoardResponse);

			const getResult = await getBoard.call(mockExecuteFunctions, mockApiClient, 0);

			expect(mockApiClient.getBoard).toHaveBeenCalledWith('board123');
			expect(getResult.json).toEqual(mockTransformedData);

			// 3. UPDATE BOARD
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('Updated Board') // name
				.mockReturnValueOnce('Updated description') // description
				.mockReturnValueOnce('protected'); // privacy

			mockApiClient.updateBoard.mockResolvedValue(updatedBoardResponse);

			const updateResult = await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('board123', {
				name: 'Updated Board',
				description: 'Updated description',
				privacy: 'protected',
			});
			expect(updateResult.json).toEqual(mockUpdatedTransformedData);

			// 4. DELETE BOARD
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce(true); // confirmDeletion

			mockApiClient.getBoard.mockResolvedValue(updatedBoardResponse);
			mockApiClient.deleteBoard.mockResolvedValue();

			const mockDate = '2023-01-01T12:00:00.000Z';
			jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

			const deleteResult = await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			expect(mockApiClient.deleteBoard).toHaveBeenCalledWith('board123');
			expect(deleteResult.json).toEqual({
				success: true,
				boardId: 'board123',
				boardName: 'Updated Board',
				message: 'Board "Updated Board" has been successfully deleted',
				deletedAt: mockDate,
				pinCount: 0,
				warning: undefined,
			});
		});

		it('should handle board lifecycle with pins', async () => {
			// Board with pins
			const boardWithPins: BoardResponse = {
				id: 'board456',
				name: 'Board with Pins',
				description: 'Has some pins',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/with-pins',
				privacy: 'public',
				pin_count: 25,
				follower_count: 5,
			};

			// CREATE
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Board with Pins')
				.mockReturnValueOnce('Has some pins')
				.mockReturnValueOnce('public');

			mockApiClient.createBoard.mockResolvedValue(boardWithPins);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// DELETE (with pins warning)
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board456')
				.mockReturnValueOnce(true);

			mockApiClient.getBoard.mockResolvedValue(boardWithPins);
			mockApiClient.deleteBoard.mockResolvedValue();

			const mockDate = '2023-01-01T12:00:00.000Z';
			jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

			const deleteResult = await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			expect(deleteResult.json.warning).toBe(
				'This board contained 25 pins which have also been deleted',
			);
			expect(deleteResult.json.pinCount).toBe(25);
		});
	});

	describe('privacy transitions', () => {
		it('should handle privacy level changes', async () => {
			const privacyLevels = ['public', 'protected', 'secret'] as const;

			for (let i = 0; i < privacyLevels.length; i++) {
				const currentPrivacy = privacyLevels[i];
				const nextPrivacy = privacyLevels[(i + 1) % privacyLevels.length];

				const boardResponse: BoardResponse = {
					id: `board${i}`,
					name: `Privacy Test Board ${i}`,
					created_at: '2023-01-01T00:00:00Z',
					url: `https://pinterest.com/board/privacy${i}`,
					privacy: nextPrivacy,
					pin_count: 0,
					follower_count: 0,
				};

				// Update privacy
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(`board${i}`) // boardId
					.mockReturnValueOnce('') // name (empty)
					.mockReturnValueOnce('') // description (empty)
					.mockReturnValueOnce(nextPrivacy); // privacy

				mockApiClient.updateBoard.mockResolvedValue(boardResponse);
				(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

				await updateBoard.call(mockExecuteFunctions, mockApiClient, 0);

				expect(mockApiClient.updateBoard).toHaveBeenCalledWith(`board${i}`, {
					privacy: nextPrivacy,
				});

				// Reset mocks for next iteration
				jest.clearAllMocks();
				mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			}
		});
	});

	describe('error recovery scenarios', () => {
		it('should handle creation failure and retry', async () => {
			// First attempt fails
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Failed Board')
				.mockReturnValueOnce('Description')
				.mockReturnValueOnce('public');

			const createError = new Error('Creation failed');
			mockApiClient.createBoard.mockRejectedValueOnce(createError);

			await expect(createBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow();

			// Second attempt succeeds
			const successResponse: BoardResponse = {
				id: 'board789',
				name: 'Retry Board',
				description: 'Description',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/retry',
				privacy: 'public',
				pin_count: 0,
				follower_count: 0,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('Retry Board')
				.mockReturnValueOnce('Description')
				.mockReturnValueOnce('public');

			mockApiClient.createBoard.mockResolvedValue(successResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue({});

			const result = await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			expect(result.json).toBeDefined();
			expect(mockApiClient.createBoard).toHaveBeenCalledTimes(2);
		});

		it('should handle update of non-existent board', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('nonexistent123')
				.mockReturnValueOnce('Updated Name')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('');

			const notFoundError = new Error('Board not found');
			mockApiClient.updateBoard.mockRejectedValue(notFoundError);

			await expect(updateBoard.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow();

			expect(mockApiClient.updateBoard).toHaveBeenCalledWith('nonexistent123', {
				name: 'Updated Name',
			});
		});

		it('should handle deletion of already deleted board', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('deleted123')
				.mockReturnValueOnce(true);

			const notFoundError = new Error('Board not found - 404');
			mockApiClient.getBoard.mockRejectedValue(notFoundError);

			const mockDate = '2023-01-01T12:00:00.000Z';
			jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

			const result = await deleteBoard.call(mockExecuteFunctions, mockApiClient, 0);

			expect(result.json.message).toBe('Board not found (may have been already deleted)');
			expect(mockApiClient.deleteBoard).not.toHaveBeenCalled();
		});
	});

	describe('data consistency', () => {
		it('should maintain consistent board data across operations', async () => {
			const boardData = {
				id: 'consistent123',
				name: 'Consistent Board',
				description: 'Consistent description',
				privacy: 'public' as const,
			};

			const boardResponse: BoardResponse = {
				...boardData,
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/board/consistent',
				pin_count: 0,
				follower_count: 0,
			};

			const transformedData = {
				boardId: boardData.id,
				name: boardData.name,
				description: boardData.description,
				privacy: boardData.privacy,
			};

			// CREATE
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(boardData.name)
				.mockReturnValueOnce(boardData.description)
				.mockReturnValueOnce(boardData.privacy);

			mockApiClient.createBoard.mockResolvedValue(boardResponse);
			(DataTransformer.transformBoardResponse as jest.Mock).mockReturnValue(transformedData);

			const createResult = await createBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// GET
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(boardData.id);
			mockApiClient.getBoard.mockResolvedValue(boardResponse);

			const getResult = await getBoard.call(mockExecuteFunctions, mockApiClient, 0);

			// Verify consistency
			expect(createResult.json).toEqual(getResult.json);
			expect(createResult.json.boardId).toBe(boardData.id);
			expect(createResult.json.name).toBe(boardData.name);
			expect(createResult.json.description).toBe(boardData.description);
			expect(createResult.json.privacy).toBe(boardData.privacy);
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});
});
