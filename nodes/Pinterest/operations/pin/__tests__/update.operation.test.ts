import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updatePin } from '../update.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { PinResponse, UpdatePinRequest } from '../../../utils/types';
import { DataTransformer } from '../../../utils/DataTransformer';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer');

describe('Pin Update Operation', () => {
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
			updatePin: jest.fn(),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('successful pin updates', () => {
		it('should update pin with all fields', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const updateData = {
				title: 'Updated Title',
				description: 'Updated Description',
				link: 'https://updated-example.com',
				boardId: 'new-board-123',
				altText: 'Updated alt text',
			};

			const expectedUpdateRequest: UpdatePinRequest = {
				title: updateData.title,
				description: updateData.description,
				link: updateData.link,
				board_id: updateData.boardId,
				alt_text: updateData.altText,
			};

			const mockPinResponse: PinResponse = {
				id: pinId,
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/test-pin-123',
				title: updateData.title,
				description: updateData.description,
				link: updateData.link,
				board_id: updateData.boardId,
				alt_text: updateData.altText,
				media: {
					url: 'https://i.pinimg.com/test.jpg',
					media_type: 'image',
				},
			};

			const mockTransformedData = {
				pinId: pinId,
				title: updateData.title,
				description: updateData.description,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce(updateData.title) // title
				.mockReturnValueOnce(updateData.description) // description
				.mockReturnValueOnce(updateData.link) // link
				.mockReturnValueOnce(updateData.boardId) // boardId
				.mockReturnValueOnce(updateData.altText); // altText

			mockApiClient.updatePin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue(mockTransformedData);

			// Act
			const result = await updatePin.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.updatePin).toHaveBeenCalledWith(pinId, expectedUpdateRequest);
			expect(DataTransformer.transformPinResponse).toHaveBeenCalledWith(mockPinResponse);
			expect(result).toEqual({
				json: mockTransformedData,
				pairedItem: { item: 0 },
			});
		});

		it('should update pin with only title', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const title = 'New Title Only';

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce(title) // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // boardId
				.mockReturnValueOnce(''); // altText

			const mockPinResponse: PinResponse = {
				id: pinId,
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/test-pin-123',
				title: title,
				board_id: 'board-123',
				media: {
					url: 'https://i.pinimg.com/test.jpg',
					media_type: 'image',
				},
			};

			mockApiClient.updatePin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue({});

			// Act
			await updatePin.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.updatePin).toHaveBeenCalledWith(pinId, { title });
		});

		it('should update pin with only description', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const description = 'New Description Only';

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce(description) // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // boardId
				.mockReturnValueOnce(''); // altText

			const mockPinResponse: PinResponse = {
				id: pinId,
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/test-pin-123',
				description: description,
				board_id: 'board-123',
				media: {
					url: 'https://i.pinimg.com/test.jpg',
					media_type: 'image',
				},
			};

			mockApiClient.updatePin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue({});

			// Act
			await updatePin.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.updatePin).toHaveBeenCalledWith(pinId, { description });
		});
	});

	describe('validation errors', () => {
		it('should throw error when pin ID is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValue('');

			// Act & Assert
			await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
			await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Pin ID is required',
			);
		});

		it('should throw error for invalid pin ID format', async () => {
			// Arrange
			const invalidPinId = 'invalid@pin#id';
			mockExecuteFunctions.getNodeParameter.mockReturnValue(invalidPinId);

			// Act & Assert
			await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
			await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Invalid pin ID format',
			);
		});

		it('should throw error for invalid URL format', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const invalidUrl = 'not-a-valid-url';

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce(invalidUrl) // link
				.mockReturnValueOnce('') // boardId
				.mockReturnValueOnce(''); // altText

			// Act & Assert
			await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Invalid URL format for link',
			);
		});

		it('should throw error for invalid board ID format', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const invalidBoardId = 'invalid@board#id';

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce(invalidBoardId) // boardId
				.mockReturnValueOnce(''); // altText

			// Act & Assert
			await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Invalid board ID format',
			);
		});

		it('should throw error when no fields are provided for update', async () => {
			// Arrange
			const pinId = 'test-pin-123';

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // boardId
				.mockReturnValueOnce(''); // altText

			// Act & Assert
			await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'At least one field must be provided for update',
			);
		});
	});

	describe('URL validation', () => {
		it('should accept valid URLs', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const validUrls = [
				'https://example.com',
				'http://example.com',
				'https://subdomain.example.com/path?query=value',
				'https://example.com:8080/path',
			];

			const mockPinResponse: PinResponse = {
				id: pinId,
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/test',
				board_id: 'board-123',
				media: {
					url: 'https://i.pinimg.com/test.jpg',
					media_type: 'image',
				},
			};

			mockApiClient.updatePin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue({});

			// Act & Assert
			for (const validUrl of validUrls) {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(pinId) // pinId
					.mockReturnValueOnce('') // title
					.mockReturnValueOnce('') // description
					.mockReturnValueOnce(validUrl) // link
					.mockReturnValueOnce('') // boardId
					.mockReturnValueOnce(''); // altText

				await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).resolves.toBeDefined();
			}
		});

		it('should reject invalid URLs', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const invalidUrls = ['not-a-url', 'invalid-url-format', 'just-text'];

			// Act & Assert
			for (const invalidUrl of invalidUrls) {
				// Reset mocks for each iteration
				jest.clearAllMocks();

				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(pinId) // pinId
					.mockReturnValueOnce('') // title
					.mockReturnValueOnce('') // description
					.mockReturnValueOnce(invalidUrl) // link
					.mockReturnValueOnce('') // boardId
					.mockReturnValueOnce(''); // altText

				await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
					NodeOperationError,
				);
			}
		});
	});

	describe('API errors', () => {
		it('should propagate API errors', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const title = 'New Title';
			const apiError = new Error('Pin not found');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce(title) // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // boardId
				.mockReturnValueOnce(''); // altText

			mockApiClient.updatePin.mockRejectedValue(apiError);

			// Act & Assert
			await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				apiError,
			);
		});

		it('should not call DataTransformer when API fails', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const title = 'New Title';
			const apiError = new Error('API Error');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce(title) // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // boardId
				.mockReturnValueOnce(''); // altText

			mockApiClient.updatePin.mockRejectedValue(apiError);

			// Act & Assert
			await expect(updatePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow();
			expect(DataTransformer.transformPinResponse).not.toHaveBeenCalled();
		});
	});
});
