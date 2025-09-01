import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getPin } from '../get.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { PinResponse } from '../../../utils/types';
import { DataTransformer } from '../../../utils/DataTransformer';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer');

describe('Pin Get Operation', () => {
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
			getPin: jest.fn(),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('successful pin retrieval', () => {
		it('should retrieve pin with valid pin ID', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const mockPinResponse: PinResponse = {
				id: pinId,
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/test-pin-123',
				title: 'Test Pin',
				description: 'Test Description',
				link: 'https://example.com',
				board_id: 'board-123',
				media: {
					url: 'https://i.pinimg.com/test.jpg',
					media_type: 'image',
				},
			};

			const mockTransformedData = {
				pinId: pinId,
				url: mockPinResponse.url,
				title: mockPinResponse.title,
				description: mockPinResponse.description,
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValue(pinId);
			mockApiClient.getPin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue(mockTransformedData);

			// Act
			const result = await getPin.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('pinId', 0);
			expect(mockApiClient.getPin).toHaveBeenCalledWith(pinId);
			expect(DataTransformer.transformPinResponse).toHaveBeenCalledWith(mockPinResponse);
			expect(result).toEqual({
				json: mockTransformedData,
				pairedItem: { item: 0 },
			});
		});

		it('should handle pin with minimal data', async () => {
			// Arrange
			const pinId = 'minimal-pin';
			const mockPinResponse: PinResponse = {
				id: pinId,
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/minimal-pin',
				board_id: 'board-123',
				media: {
					url: 'https://i.pinimg.com/minimal.jpg',
					media_type: 'image',
				},
			};

			const mockTransformedData = {
				pinId: pinId,
				url: mockPinResponse.url,
				title: null,
				description: null,
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValue(pinId);
			mockApiClient.getPin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue(mockTransformedData);

			// Act
			const result = await getPin.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result.json).toEqual(mockTransformedData);
		});
	});

	describe('validation errors', () => {
		it('should throw error when pin ID is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValue('');

			// Act & Assert
			await expect(getPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
			await expect(getPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Pin ID is required',
			);
		});

		it('should throw error when pin ID is null', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValue(null);

			// Act & Assert
			await expect(getPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for invalid pin ID format', async () => {
			// Arrange
			const invalidPinId = 'invalid@pin#id';
			mockExecuteFunctions.getNodeParameter.mockReturnValue(invalidPinId);

			// Act & Assert
			await expect(getPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
			await expect(getPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Invalid pin ID format',
			);
		});

		it('should accept valid pin ID formats', async () => {
			// Arrange
			const validPinIds = ['123456789', 'abc-def_123', 'PIN123', 'test-pin-id'];
			const mockPinResponse: PinResponse = {
				id: 'test',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/test',
				board_id: 'board-123',
				media: {
					url: 'https://i.pinimg.com/test.jpg',
					media_type: 'image',
				},
			};

			mockApiClient.getPin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue({});

			// Act & Assert
			for (const pinId of validPinIds) {
				mockExecuteFunctions.getNodeParameter.mockReturnValue(pinId);
				await expect(getPin.call(mockExecuteFunctions, mockApiClient, 0)).resolves.toBeDefined();
			}
		});
	});

	describe('API errors', () => {
		it('should propagate API errors', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const apiError = new Error('Pin not found');

			mockExecuteFunctions.getNodeParameter.mockReturnValue(pinId);
			mockApiClient.getPin.mockRejectedValue(apiError);

			// Act & Assert
			await expect(getPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(apiError);
		});

		it('should not call DataTransformer when API fails', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const apiError = new Error('API Error');

			mockExecuteFunctions.getNodeParameter.mockReturnValue(pinId);
			mockApiClient.getPin.mockRejectedValue(apiError);

			// Act & Assert
			await expect(getPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow();
			expect(DataTransformer.transformPinResponse).not.toHaveBeenCalled();
		});
	});

	describe('parameter handling', () => {
		it('should use correct item index for parameter retrieval', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const itemIndex = 5;
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

			mockExecuteFunctions.getNodeParameter.mockReturnValue(pinId);
			mockApiClient.getPin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue({});

			// Act
			await getPin.call(mockExecuteFunctions, mockApiClient, itemIndex);

			// Assert
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('pinId', itemIndex);
		});

		it('should include correct item index in result', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const itemIndex = 3;
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

			mockExecuteFunctions.getNodeParameter.mockReturnValue(pinId);
			mockApiClient.getPin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue({});

			// Act
			const result = await getPin.call(mockExecuteFunctions, mockApiClient, itemIndex);

			// Assert
			expect(result.pairedItem).toEqual({ item: itemIndex });
		});
	});
});
