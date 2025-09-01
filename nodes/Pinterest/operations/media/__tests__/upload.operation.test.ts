import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { uploadMedia } from '../upload.operation';
import { MediaUploader } from '../../../utils/MediaUploader';

// Mock dependencies
jest.mock('../../../utils/MediaUploader');

describe('Upload Media Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockUploadMedia: jest.Mock;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ name: 'Pinterest' }),
			getNodeParameter: jest.fn(),
			helpers: {
				assertBinaryData: jest.fn(),
			},
		} as any;

		// Mock MediaUploader static method
		(MediaUploader.extractMediaFileInfo as jest.Mock).mockImplementation((binaryData) => ({
			filename: binaryData.fileName,
			mimeType: binaryData.mimeType,
			size: binaryData.data.length,
			buffer: binaryData.data,
		}));

		(MediaUploader.formatFileSize as jest.Mock).mockImplementation((bytes) => `${bytes} bytes`);

		// Mock MediaUploader instance methods
		mockUploadMedia = jest.fn();
		(MediaUploader as any).mockImplementation(() => ({
			uploadMedia: mockUploadMedia,
		}));
	});

	it('should upload media successfully', async () => {
		// Arrange
		const mockBinaryData: IDataObject = {
			data: Buffer.from('test-image-data'),
			mimeType: 'image/jpeg',
			fileName: 'test.jpg',
		};

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('data') // binaryPropertyName
			.mockReturnValueOnce(false) // trackProgress
			.mockReturnValueOnce(true); // waitForProcessing

		(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

		const mockUploadResult = {
			mediaId: 'test-media-123',
			mediaType: 'image' as const,
			status: 'succeeded' as const,
			uploadTime: 1000,
			fileSize: 15,
			filename: 'test.jpg',
		};

		mockUploadMedia.mockResolvedValue(mockUploadResult);

		// Act
		const result = await uploadMedia.call(mockExecuteFunctions, 0);

		// Assert
		expect(result.json).toMatchObject({
			mediaId: 'test-media-123',
			mediaType: 'image',
			status: 'succeeded',
			uploadTime: 1000,
			fileSize: 15,
			filename: 'test.jpg',
			fileSizeFormatted: '15 bytes',
		});
	});

	it('should handle upload errors', async () => {
		// Arrange
		const mockBinaryData: IDataObject = {
			data: Buffer.from('test-image-data'),
			mimeType: 'image/jpeg',
			fileName: 'test.jpg',
		};

		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('data')
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true);

		(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

		mockUploadMedia.mockRejectedValue(new Error('Upload failed'));

		// Act & Assert
		await expect(uploadMedia.call(mockExecuteFunctions, 0)).rejects.toThrow(
			'Failed to upload media: Upload failed',
		);
	});
});
