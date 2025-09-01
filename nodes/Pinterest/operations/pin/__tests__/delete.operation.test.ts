import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { deletePin } from '../delete.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';

describe('Pin Delete Operation', () => {
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
			deletePin: jest.fn(),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('successful pin deletion', () => {
		it('should delete pin with valid pin ID and confirmation', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const confirmDelete = true;

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId) // pinId
				.mockReturnValueOnce(confirmDelete); // confirmDelete

			mockApiClient.deletePin.mockResolvedValue(undefined);

			// Act
			const result = await deletePin.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('pinId', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('confirmDelete', 0, false);
			expect(mockApiClient.deletePin).toHaveBeenCalledWith(pinId);

			expect(result.json).toMatchObject({
				success: true,
				pinId: pinId,
				message: 'Pin deleted successfully',
			});
			expect(result.json.deletedAt).toBeDefined();
			expect(result.pairedItem).toEqual({ item: 0 });
		});

		it('should include correct timestamp in response', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const confirmDelete = true;
			const beforeTime = new Date();

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId)
				.mockReturnValueOnce(confirmDelete);

			mockApiClient.deletePin.mockResolvedValue(undefined);

			// Act
			const result = await deletePin.call(mockExecuteFunctions, mockApiClient, 0);
			const afterTime = new Date();

			// Assert
			const deletedAt = new Date(result.json.deletedAt as string);
			expect(deletedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
			expect(deletedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
		});
	});

	describe('validation errors', () => {
		it('should throw error when pin ID is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValue('');

			// Act & Assert
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Pin ID is required',
			);
		});

		it('should throw error when pin ID is null', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValue(null);

			// Act & Assert
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for invalid pin ID format', async () => {
			// Arrange
			const invalidPinId = 'invalid@pin#id';
			mockExecuteFunctions.getNodeParameter.mockReturnValue(invalidPinId);

			// Act & Assert
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Invalid pin ID format',
			);
		});

		it('should accept valid pin ID formats', async () => {
			// Arrange
			const validPinIds = ['123456789', 'abc-def_123', 'PIN123', 'test-pin-id'];
			const confirmDelete = true;

			mockApiClient.deletePin.mockResolvedValue(undefined);

			// Act & Assert
			for (const pinId of validPinIds) {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(pinId)
					.mockReturnValueOnce(confirmDelete);

				await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).resolves.toBeDefined();
			}
		});
	});

	describe('confirmation handling', () => {
		it('should throw error when confirmation is false', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const confirmDelete = false;

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId)
				.mockReturnValueOnce(confirmDelete);

			// Act & Assert
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Pin deletion must be confirmed',
			);
		});

		it('should throw error when confirmation is not provided (defaults to false)', async () => {
			// Arrange
			const pinId = 'test-pin-123';

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(pinId).mockReturnValueOnce(false); // Default value from getNodeParameter

			// Act & Assert
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Pin deletion must be confirmed',
			);
		});

		it('should not call API when confirmation is false', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const confirmDelete = false;

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId)
				.mockReturnValueOnce(confirmDelete);

			// Act & Assert
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow();
			expect(mockApiClient.deletePin).not.toHaveBeenCalled();
		});
	});

	describe('API errors', () => {
		it('should propagate API errors', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const confirmDelete = true;
			const apiError = new Error('Pin not found');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId)
				.mockReturnValueOnce(confirmDelete);

			mockApiClient.deletePin.mockRejectedValue(apiError);

			// Act & Assert
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				apiError,
			);
		});

		it('should handle network errors', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const confirmDelete = true;
			const networkError = new Error('Network timeout');

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId)
				.mockReturnValueOnce(confirmDelete);

			mockApiClient.deletePin.mockRejectedValue(networkError);

			// Act & Assert
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				networkError,
			);
		});
	});

	describe('parameter handling', () => {
		it('should use correct item index for parameter retrieval', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const confirmDelete = true;
			const itemIndex = 5;

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId)
				.mockReturnValueOnce(confirmDelete);

			mockApiClient.deletePin.mockResolvedValue(undefined);

			// Act
			await deletePin.call(mockExecuteFunctions, mockApiClient, itemIndex);

			// Assert
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('pinId', itemIndex);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'confirmDelete',
				itemIndex,
				false,
			);
		});

		it('should include correct item index in result', async () => {
			// Arrange
			const pinId = 'test-pin-123';
			const confirmDelete = true;
			const itemIndex = 3;

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce(pinId)
				.mockReturnValueOnce(confirmDelete);

			mockApiClient.deletePin.mockResolvedValue(undefined);

			// Act
			const result = await deletePin.call(mockExecuteFunctions, mockApiClient, itemIndex);

			// Assert
			expect(result.pairedItem).toEqual({ item: itemIndex });
		});

		it('should use default value for confirmDelete parameter', async () => {
			// Arrange
			const pinId = 'test-pin-123';

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(pinId).mockReturnValueOnce(false); // Default value

			// Act & Assert
			await expect(deletePin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow();
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('confirmDelete', 0, false);
		});
	});
});
