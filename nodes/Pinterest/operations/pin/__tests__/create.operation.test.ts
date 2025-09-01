import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPin } from '../create.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { CreatePinRequest, PinResponse, MediaResponse } from '../../../utils/types';
import { DataTransformer } from '../../../utils/DataTransformer';
import { MediaUploader } from '../../../utils/MediaUploader';

// Mock the DataTransformer and MediaUploader
jest.mock('../../../utils/DataTransformer');
jest.mock('../../../utils/MediaUploader');

describe('Pin Create Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockApiClient: jest.Mocked<PinterestApiClient>;
	let mockNode: any;
	let mockUploadMedia: jest.Mock;

	beforeEach(() => {
		mockNode = { name: 'Pinterest' };

		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue(mockNode),
			helpers: {
				assertBinaryData: jest.fn(),
			},
		} as unknown as jest.Mocked<IExecuteFunctions>;

		mockApiClient = {
			createPin: jest.fn(),
			uploadMedia: jest.fn(),
		} as unknown as jest.Mocked<PinterestApiClient>;

		// Mock DataTransformer
		(DataTransformer.transformPinResponse as jest.Mock).mockReturnValue({
			pinId: 'test-pin-id',
			url: 'https://pinterest.com/pin/test-pin-id',
			title: 'Test Pin',
		});

		// Mock MediaUploader static method
		(MediaUploader.extractMediaFileInfo as jest.Mock).mockImplementation((binaryData) => ({
			filename: binaryData.fileName,
			mimeType: binaryData.mimeType,
			size: binaryData.data.length,
			buffer: binaryData.data,
		}));

		// Mock MediaUploader instance methods
		mockUploadMedia = jest.fn();
		(MediaUploader as any).mockImplementation(() => ({
			uploadMedia: mockUploadMedia,
		}));

		jest.clearAllMocks();
	});

	describe('URL Media Source', () => {
		it('should create pin with image URL successfully', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('url') // mediaSource
				.mockReturnValueOnce('Test Pin Title') // title
				.mockReturnValueOnce('Test pin description') // description
				.mockReturnValueOnce('https://example.com') // link
				.mockReturnValueOnce('Alt text for image') // altText
				.mockReturnValueOnce('https://example.com/image.jpg'); // mediaUrl

			const mockPinResponse: PinResponse = {
				id: 'test-pin-id',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/test-pin-id',
				title: 'Test Pin Title',
				description: 'Test pin description',
				link: 'https://example.com',
				board_id: 'board123',
				alt_text: 'Alt text for image',
				media: {
					url: 'https://example.com/image.jpg',
					media_type: 'image',
				},
			};

			mockApiClient.createPin.mockResolvedValue(mockPinResponse);

			// Act
			const result = await createPin.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.createPin).toHaveBeenCalledWith({
				board_id: 'board123',
				media_source: {
					source_type: 'image_url',
					url: 'https://example.com/image.jpg',
					media_id: undefined,
				},
				title: 'Test Pin Title',
				description: 'Test pin description',
				link: 'https://example.com',
				alt_text: 'Alt text for image',
			});

			expect(DataTransformer.transformPinResponse).toHaveBeenCalledWith(mockPinResponse);
			expect(result).toEqual({
				json: {
					pinId: 'test-pin-id',
					url: 'https://pinterest.com/pin/test-pin-id',
					title: 'Test Pin',
				},
				pairedItem: { item: 0 },
			});
		});

		it('should throw error when board ID is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('') // boardId (empty)
				.mockReturnValueOnce('url'); // mediaSource

			// Act & Assert
			await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Board ID is required for creating a pin',
			);
		});

		it('should throw error when media URL is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('url') // mediaSource
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // altText
				.mockReturnValueOnce(''); // mediaUrl (empty)

			// Act & Assert
			await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Media URL is required when using URL source',
			);
		});

		it('should throw error when media URL is invalid', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('url') // mediaSource
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // altText
				.mockReturnValueOnce('invalid-url'); // mediaUrl (invalid)

			// Act & Assert
			await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Invalid media URL format',
			);
		});
	});

	describe('Upload Media Source', () => {
		it('should create pin with image upload successfully', async () => {
			// Arrange
			const mockBinaryData = {
				data: Buffer.from('fake-image-data'),
				mimeType: 'image/jpeg',
				fileName: 'test-image.jpg',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('upload') // mediaSource
				.mockReturnValueOnce('Test Pin') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // altText
				.mockReturnValueOnce('data'); // binaryPropertyName

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			const mockUploadResult = {
				mediaId: 'media123',
				mediaType: 'image' as const,
				status: 'succeeded' as const,
				uploadTime: 1000,
				fileSize: mockBinaryData.data.length,
				filename: 'test-image.jpg',
			};

			const mockPinResponse: PinResponse = {
				id: 'test-pin-id',
				created_at: '2023-01-01T00:00:00Z',
				url: 'https://pinterest.com/pin/test-pin-id',
				title: 'Test Pin',
				board_id: 'board123',
				media: {
					url: 'https://pinterest.com/media/media123',
					media_type: 'image',
				},
			};

			mockUploadMedia.mockResolvedValue(mockUploadResult);
			mockApiClient.createPin.mockResolvedValue(mockPinResponse);

			// Act
			const result = await createPin.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
			expect(mockUploadMedia).toHaveBeenCalledWith({
				filename: 'test-image.jpg',
				mimeType: 'image/jpeg',
				size: expect.any(Number),
				buffer: expect.any(Buffer),
			});

			expect(mockApiClient.createPin).toHaveBeenCalledWith({
				board_id: 'board123',
				media_source: {
					source_type: 'image_upload',
					url: undefined,
					media_id: 'media123',
				},
				title: 'Test Pin',
				description: undefined,
				link: undefined,
				alt_text: undefined,
			});
		});

		it('should throw error when media file is missing', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('upload') // mediaSource
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // altText
				.mockReturnValueOnce('data'); // binaryPropertyName

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(() => {
				throw new Error('No binary data found');
			});

			// Act & Assert
			await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'No binary data found',
			);
		});

		it('should throw error when upload fails', async () => {
			// Arrange
			const mockBinaryData = {
				data: Buffer.from('fake-image-data'),
				mimeType: 'image/jpeg',
				fileName: 'test-image.jpg',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('upload') // mediaSource
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // altText
				.mockReturnValueOnce('data'); // binaryPropertyName

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			const mockUploadResult = {
				mediaId: 'media123',
				mediaType: 'image' as const,
				status: 'failed' as const,
				uploadTime: 1000,
				fileSize: mockBinaryData.data.length,
				filename: 'test-image.jpg',
			};

			mockUploadMedia.mockResolvedValue(mockUploadResult);

			// Act & Assert
			await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Media upload failed with status: failed',
			);
		});
	});

	describe('Media File Validation', () => {
		it('should throw error for invalid image format', async () => {
			// Arrange
			const mockBinaryData = {
				data: Buffer.from('fake-image-data'),
				mimeType: 'image/bmp', // Invalid format
				fileName: 'test-image.bmp',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('upload') // mediaSource
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // altText
				.mockReturnValueOnce('data'); // binaryPropertyName

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			// Mock MediaUploader to throw validation error
			mockUploadMedia.mockRejectedValue(
				new NodeOperationError(
					mockNode,
					'Unsupported file format: bmp. Supported formats: Images (jpeg, jpg, png, gif), Videos (mp4, mov)',
				),
			);

			// Act & Assert
			await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Unsupported file format',
			);
		});

		it('should throw error for oversized image', async () => {
			// Arrange
			const largeBinaryData = {
				data: Buffer.alloc(15 * 1024 * 1024), // 15MB (over 10MB limit)
				mimeType: 'image/jpeg',
				fileName: 'test-image.jpg',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('upload') // mediaSource
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // altText
				.mockReturnValueOnce('data'); // binaryPropertyName

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(largeBinaryData);

			// Mock MediaUploader to throw size validation error
			mockUploadMedia.mockRejectedValue(
				new NodeOperationError(
					mockNode,
					'File size 15MB exceeds maximum allowed size of 10MB for images',
				),
			);

			// Act & Assert
			await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'exceeds maximum allowed size of 10MB',
			);
		});
	});

	describe('Error Handling', () => {
		it('should throw error when media source is invalid', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('invalid'); // mediaSource (invalid)

			// Act & Assert
			await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Media source must be either "url" or "upload"',
			);
		});

		it('should handle API errors gracefully', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board123') // boardId
				.mockReturnValueOnce('url') // mediaSource
				.mockReturnValueOnce('') // title
				.mockReturnValueOnce('') // description
				.mockReturnValueOnce('') // link
				.mockReturnValueOnce('') // altText
				.mockReturnValueOnce('https://example.com/image.jpg'); // mediaUrl

			const apiError = new Error('Pinterest API Error');
			mockApiClient.createPin.mockRejectedValue(apiError);

			// Act & Assert
			await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				'Failed to create pin: Pinterest API Error',
			);
		});
	});
});
