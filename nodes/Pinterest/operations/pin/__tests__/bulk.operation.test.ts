import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { bulkGetPins, bulkUpdatePins, bulkDeletePins } from '../bulk.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { PinResponse, UpdatePinRequest } from '../../../utils/types';
import { DataTransformer } from '../../../utils/DataTransformer';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer');

describe('Pin Bulk Operations', () => {
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
			updatePin: jest.fn(),
			deletePin: jest.fn(),
		} as any;

		// Reset mocks
		jest.clearAllMocks();
	});

	describe('bulkGetPins', () => {
		describe('successful bulk retrieval', () => {
			it('should retrieve multiple pins from comma-separated string', async () => {
				// Arrange
				const pinIds = 'pin1,pin2,pin3';
				const mockPinResponses: PinResponse[] = [
					{
						id: 'pin1',
						created_at: '2023-01-01T00:00:00Z',
						url: 'https://pinterest.com/pin/pin1',
						board_id: 'board-123',
						media: { url: 'https://i.pinimg.com/pin1.jpg', media_type: 'image' },
					},
					{
						id: 'pin2',
						created_at: '2023-01-01T00:00:00Z',
						url: 'https://pinterest.com/pin/pin2',
						board_id: 'board-123',
						media: { url: 'https://i.pinimg.com/pin2.jpg', media_type: 'image' },
					},
					{
						id: 'pin3',
						created_at: '2023-01-01T00:00:00Z',
						url: 'https://pinterest.com/pin/pin3',
						board_id: 'board-123',
						media: { url: 'https://i.pinimg.com/pin3.jpg', media_type: 'image' },
					},
				];

				mockExecuteFunctions.getNodeParameter.mockReturnValue(pinIds);
				mockApiClient.getPin
					.mockResolvedValueOnce(mockPinResponses[0])
					.mockResolvedValueOnce(mockPinResponses[1])
					.mockResolvedValueOnce(mockPinResponses[2]);

				(DataTransformer.transformPinResponse as jest.Mock)
					.mockReturnValueOnce({ pinId: 'pin1' })
					.mockReturnValueOnce({ pinId: 'pin2' })
					.mockReturnValueOnce({ pinId: 'pin3' });

				// Act
				const results = await bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0);

				// Assert
				expect(results).toHaveLength(3);
				expect(mockApiClient.getPin).toHaveBeenCalledTimes(3);
				expect(mockApiClient.getPin).toHaveBeenCalledWith('pin1');
				expect(mockApiClient.getPin).toHaveBeenCalledWith('pin2');
				expect(mockApiClient.getPin).toHaveBeenCalledWith('pin3');
			});

			it('should retrieve multiple pins from array', async () => {
				// Arrange
				const pinIds = ['pin1', 'pin2'];
				const mockPinResponses: PinResponse[] = [
					{
						id: 'pin1',
						created_at: '2023-01-01T00:00:00Z',
						url: 'https://pinterest.com/pin/pin1',
						board_id: 'board-123',
						media: { url: 'https://i.pinimg.com/pin1.jpg', media_type: 'image' },
					},
					{
						id: 'pin2',
						created_at: '2023-01-01T00:00:00Z',
						url: 'https://pinterest.com/pin/pin2',
						board_id: 'board-123',
						media: { url: 'https://i.pinimg.com/pin2.jpg', media_type: 'image' },
					},
				];

				mockExecuteFunctions.getNodeParameter.mockReturnValue(pinIds);
				mockApiClient.getPin
					.mockResolvedValueOnce(mockPinResponses[0])
					.mockResolvedValueOnce(mockPinResponses[1]);

				(DataTransformer.transformPinResponse as jest.Mock)
					.mockReturnValueOnce({ pinId: 'pin1' })
					.mockReturnValueOnce({ pinId: 'pin2' });

				// Act
				const results = await bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0);

				// Assert
				expect(results).toHaveLength(2);
				expect(mockApiClient.getPin).toHaveBeenCalledTimes(2);
			});

			it('should handle mixed success and errors', async () => {
				// Arrange
				const pinIds = 'pin1,pin2,pin3';
				const mockPinResponse: PinResponse = {
					id: 'pin1',
					created_at: '2023-01-01T00:00:00Z',
					url: 'https://pinterest.com/pin/pin1',
					board_id: 'board-123',
					media: { url: 'https://i.pinimg.com/pin1.jpg', media_type: 'image' },
				};

				mockExecuteFunctions.getNodeParameter.mockReturnValue(pinIds);
				mockApiClient.getPin
					.mockResolvedValueOnce(mockPinResponse) // pin1 success
					.mockRejectedValueOnce(new Error('Pin not found')) // pin2 error
					.mockResolvedValueOnce(mockPinResponse); // pin3 success

				(DataTransformer.transformPinResponse as jest.Mock)
					.mockReturnValueOnce({ pinId: 'pin1' })
					.mockReturnValueOnce({ pinId: 'pin3' });

				// Act
				const results = await bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0);

				// Assert
				expect(results).toHaveLength(3); // 2 successful + 1 error summary
				expect(results[2].json).toMatchObject({
					operation: 'bulkGetPins',
					errors: [{ pinId: 'pin2', error: 'Pin not found' }],
					successCount: 2,
					errorCount: 1,
					totalCount: 3,
				});
			});
		});

		describe('validation errors', () => {
			it('should throw error when no pin IDs provided', async () => {
				// Arrange
				mockExecuteFunctions.getNodeParameter.mockReturnValue('');

				// Act & Assert
				await expect(bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
					NodeOperationError,
				);
				await expect(bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
					'At least one pin ID is required',
				);
			});

			it('should throw error for invalid pin ID format', async () => {
				// Arrange
				const pinIds = 'pin1,invalid@pin,pin3';
				mockExecuteFunctions.getNodeParameter.mockReturnValue(pinIds);

				// Act & Assert
				await expect(bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
					NodeOperationError,
				);
				await expect(bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
					'Invalid pin ID format: invalid@pin',
				);
			});

			it('should throw error when batch size exceeds limit', async () => {
				// Arrange
				const pinIds = Array.from({ length: 51 }, (_, i) => `pin${i}`).join(',');
				mockExecuteFunctions.getNodeParameter.mockReturnValue(pinIds);

				// Act & Assert
				await expect(bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
					NodeOperationError,
				);
				await expect(bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
					'Too many pin IDs. Maximum batch size is 50, got 51',
				);
			});
		});
	});

	describe('bulkUpdatePins', () => {
		describe('successful bulk updates', () => {
			it('should update multiple pins with same data', async () => {
				// Arrange
				const pinIds = 'pin1,pin2';
				const updateData = {
					title: 'Bulk Updated Title',
					description: 'Bulk Updated Description',
				};

				const mockPinResponse: PinResponse = {
					id: 'pin1',
					created_at: '2023-01-01T00:00:00Z',
					url: 'https://pinterest.com/pin/pin1',
					title: updateData.title,
					description: updateData.description,
					board_id: 'board-123',
					media: { url: 'https://i.pinimg.com/pin1.jpg', media_type: 'image' },
				};

				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(pinIds) // pinIds
					.mockReturnValueOnce(updateData.title) // title
					.mockReturnValueOnce(updateData.description) // description
					.mockReturnValueOnce('') // link
					.mockReturnValueOnce('') // boardId
					.mockReturnValueOnce(''); // altText

				mockApiClient.updatePin
					.mockResolvedValueOnce(mockPinResponse)
					.mockResolvedValueOnce(mockPinResponse);

				(DataTransformer.transformPinResponse as jest.Mock)
					.mockReturnValueOnce({ pinId: 'pin1' })
					.mockReturnValueOnce({ pinId: 'pin2' });

				// Act
				const results = await bulkUpdatePins.call(mockExecuteFunctions, mockApiClient, 0);

				// Assert
				expect(results).toHaveLength(2);
				expect(mockApiClient.updatePin).toHaveBeenCalledTimes(2);
				expect(mockApiClient.updatePin).toHaveBeenCalledWith('pin1', {
					title: updateData.title,
					description: updateData.description,
				});
				expect(mockApiClient.updatePin).toHaveBeenCalledWith('pin2', {
					title: updateData.title,
					description: updateData.description,
				});
			});
		});

		describe('validation errors', () => {
			it('should throw error when no update fields provided', async () => {
				// Arrange
				const pinIds = 'pin1,pin2';

				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(pinIds) // pinIds
					.mockReturnValueOnce('') // title
					.mockReturnValueOnce('') // description
					.mockReturnValueOnce('') // link
					.mockReturnValueOnce('') // boardId
					.mockReturnValueOnce(''); // altText

				// Act & Assert
				await expect(bulkUpdatePins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
					'At least one field must be provided for update',
				);
			});
		});
	});

	describe('bulkDeletePins', () => {
		describe('successful bulk deletion', () => {
			it('should delete multiple pins with confirmation', async () => {
				// Arrange
				const pinIds = 'pin1,pin2,pin3';
				const confirmDelete = true;

				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(pinIds) // pinIds
					.mockReturnValueOnce(confirmDelete); // confirmDelete

				mockApiClient.deletePin
					.mockResolvedValueOnce(undefined)
					.mockResolvedValueOnce(undefined)
					.mockResolvedValueOnce(undefined);

				// Act
				const results = await bulkDeletePins.call(mockExecuteFunctions, mockApiClient, 0);

				// Assert
				expect(results).toHaveLength(1);
				expect(results[0].json).toMatchObject({
					operation: 'bulkDeletePins',
					success: true,
					deletedPins: ['pin1', 'pin2', 'pin3'],
					errors: [],
					successCount: 3,
					errorCount: 0,
					totalCount: 3,
				});
				expect(mockApiClient.deletePin).toHaveBeenCalledTimes(3);
			});

			it('should handle mixed success and errors in deletion', async () => {
				// Arrange
				const pinIds = 'pin1,pin2,pin3';
				const confirmDelete = true;

				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(pinIds) // pinIds
					.mockReturnValueOnce(confirmDelete); // confirmDelete

				mockApiClient.deletePin
					.mockResolvedValueOnce(undefined) // pin1 success
					.mockRejectedValueOnce(new Error('Pin not found')) // pin2 error
					.mockResolvedValueOnce(undefined); // pin3 success

				// Act
				const results = await bulkDeletePins.call(mockExecuteFunctions, mockApiClient, 0);

				// Assert
				expect(results).toHaveLength(1);
				expect(results[0].json).toMatchObject({
					operation: 'bulkDeletePins',
					success: true,
					deletedPins: ['pin1', 'pin3'],
					errors: [{ pinId: 'pin2', error: 'Pin not found' }],
					successCount: 2,
					errorCount: 1,
					totalCount: 3,
				});
			});
		});

		describe('validation errors', () => {
			it('should throw error when confirmation is false', async () => {
				// Arrange
				const pinIds = 'pin1,pin2';
				const confirmDelete = false;

				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(pinIds) // pinIds
					.mockReturnValueOnce(confirmDelete); // confirmDelete

				// Act & Assert
				await expect(bulkDeletePins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
					'Bulk pin deletion must be confirmed',
				);
			});

			it('should not call API when confirmation is false', async () => {
				// Arrange
				const pinIds = 'pin1,pin2';
				const confirmDelete = false;

				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(pinIds) // pinIds
					.mockReturnValueOnce(confirmDelete); // confirmDelete

				// Act & Assert
				await expect(bulkDeletePins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow();
				expect(mockApiClient.deletePin).not.toHaveBeenCalled();
			});
		});
	});

	describe('common validation', () => {
		it('should handle whitespace in comma-separated pin IDs', async () => {
			// Arrange
			const pinIds = ' pin1 , pin2 , pin3 ';
			const mockPinResponse: PinResponse = {
				id: 'pin1',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/pin1',
				board_id: 'board-123',
				media: { url: 'https://i.pinimg.com/pin1.jpg', media_type: 'image' },
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValue(pinIds);
			mockApiClient.getPin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue({ pinId: 'pin1' });

			// Act
			const results = await bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(results).toHaveLength(3);
			expect(mockApiClient.getPin).toHaveBeenCalledWith('pin1');
			expect(mockApiClient.getPin).toHaveBeenCalledWith('pin2');
			expect(mockApiClient.getPin).toHaveBeenCalledWith('pin3');
		});

		it('should filter out empty pin IDs', async () => {
			// Arrange
			const pinIds = 'pin1,,pin2,';
			const mockPinResponse: PinResponse = {
				id: 'pin1',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/pin1',
				board_id: 'board-123',
				media: { url: 'https://i.pinimg.com/pin1.jpg', media_type: 'image' },
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValue(pinIds);
			mockApiClient.getPin.mockResolvedValue(mockPinResponse);
			(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue({ pinId: 'pin1' });

			// Act
			const results = await bulkGetPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(results).toHaveLength(2);
			expect(mockApiClient.getPin).toHaveBeenCalledTimes(2);
			expect(mockApiClient.getPin).toHaveBeenCalledWith('pin1');
			expect(mockApiClient.getPin).toHaveBeenCalledWith('pin2');
		});
	});
});
