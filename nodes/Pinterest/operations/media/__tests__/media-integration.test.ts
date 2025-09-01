import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { MediaUploader } from '../../../utils/MediaUploader';
import { uploadMedia } from '../upload.operation';

// Mock the MediaUploader
jest.mock('../../../utils/MediaUploader');

describe('Media Upload Integration Tests', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockAssertBinaryData: jest.MockedFunction<
		(itemIndex: number, propertyName: string) => IDataObject
	>;
	let mockUploadMedia: jest.Mock;

	beforeEach(() => {
		// Create a properly typed mock for assertBinaryData
		mockAssertBinaryData = jest.fn();

		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ name: 'Pinterest' }),
			getNodeParameter: jest.fn(),
			helpers: {
				assertBinaryData: mockAssertBinaryData as any,
			},
		} as any;

		// Mock MediaUploader static methods
		(MediaUploader.extractMediaFileInfo as jest.Mock).mockImplementation((binaryData) => ({
			filename: binaryData.fileName,
			mimeType: binaryData.mimeType,
			size: binaryData.data.length,
			buffer: binaryData.data,
		}));

		(MediaUploader.formatFileSize as jest.Mock).mockImplementation(
			(bytes) => `${Math.round(bytes / 1024)} KB`,
		);

		// Mock MediaUploader instance methods
		mockUploadMedia = jest.fn();
		(MediaUploader as any).mockImplementation(() => ({
			uploadMedia: mockUploadMedia,
		}));
	});

	describe('End-to-End Media Upload', () => {
		it('should handle complete image upload workflow', async () => {
			// Prepare test image data
			const imageBuffer = Buffer.from('fake-jpeg-data');
			const mockBinaryData: IDataObject = {
				data: imageBuffer,
				mimeType: 'image/jpeg',
				fileName: 'test-image.jpg',
			};

			// Configure mock parameters
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('data') // binaryPropertyName
				.mockReturnValueOnce(true) // trackProgress
				.mockReturnValueOnce(true); // waitForProcessing

			mockAssertBinaryData.mockReturnValue(mockBinaryData);

			// Mock successful upload result
			const mockUploadResult = {
				mediaId: 'uploaded-image-123',
				mediaType: 'image' as const,
				status: 'succeeded' as const,
				uploadTime: 1000,
				fileSize: imageBuffer.length,
				filename: 'test-image.jpg',
			};

			mockUploadMedia.mockResolvedValue(mockUploadResult);

			// Execute upload
			const result = await uploadMedia.call(mockExecuteFunctions, 0);

			// Verify MediaUploader was called correctly
			expect(mockUploadMedia).toHaveBeenCalledWith(
				{
					filename: 'test-image.jpg',
					mimeType: 'image/jpeg',
					size: imageBuffer.length,
					buffer: imageBuffer,
				},
				expect.any(Function),
			); // progress callback

			// Verify result structure
			expect(result.json).toMatchObject({
				mediaId: 'uploaded-image-123',
				mediaType: 'image',
				status: 'succeeded',
				filename: 'test-image.jpg',
				fileSize: imageBuffer.length,
			});

			expect(result.json.uploadTime).toBeGreaterThan(0);
			expect(result.json.fileSizeFormatted).toBeDefined();
		});

		it('should handle complete video upload workflow', async () => {
			// Prepare test video data (smaller buffer to avoid memory issues)
			const videoBuffer = Buffer.from('fake-mp4-data');
			const mockBinaryData: IDataObject = {
				data: videoBuffer,
				mimeType: 'video/mp4',
				fileName: 'test-video.mp4',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('data')
				.mockReturnValueOnce(false)
				.mockReturnValueOnce(true);

			mockAssertBinaryData.mockReturnValue(mockBinaryData);

			const mockUploadResult = {
				mediaId: 'uploaded-video-456',
				mediaType: 'video' as const,
				status: 'succeeded' as const,
				uploadTime: 2000,
				fileSize: videoBuffer.length,
				filename: 'test-video.mp4',
			};

			mockUploadMedia.mockResolvedValue(mockUploadResult);

			const result = await uploadMedia.call(mockExecuteFunctions, 0);

			expect(mockUploadMedia).toHaveBeenCalledWith(
				{
					filename: 'test-video.mp4',
					mimeType: 'video/mp4',
					size: videoBuffer.length,
					buffer: videoBuffer,
				},
				undefined,
			); // no progress callback

			expect(result.json).toMatchObject({
				mediaId: 'uploaded-video-456',
				mediaType: 'video',
				status: 'succeeded',
				filename: 'test-video.mp4',
			});
		});

		it('should handle processing status with polling simulation', async () => {
			const imageBuffer = Buffer.from('test-image');
			const mockBinaryData: IDataObject = {
				data: imageBuffer,
				mimeType: 'image/png',
				fileName: 'processing-test.png',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('data')
				.mockReturnValueOnce(true) // trackProgress
				.mockReturnValueOnce(true); // waitForProcessing

			mockAssertBinaryData.mockReturnValue(mockBinaryData);

			// Mock processing response
			const mockUploadResult = {
				mediaId: 'processing-media-789',
				mediaType: 'image' as const,
				status: 'processing' as const,
				uploadTime: 1500,
				fileSize: imageBuffer.length,
				filename: 'processing-test.png',
			};

			mockUploadMedia.mockResolvedValue(mockUploadResult);

			const result = await uploadMedia.call(mockExecuteFunctions, 0);

			expect(result.json.status).toBe('processing');
			expect(result.json.mediaId).toBe('processing-media-789');
		});

		it('should handle various file sizes correctly', async () => {
			const testCases = [
				{
					name: 'small-image.jpg',
					mimeType: 'image/jpeg',
					size: 1024, // 1KB
				},
				{
					name: 'medium-image.png',
					mimeType: 'image/png',
					size: 5120, // 5KB (simulating 5MB)
				},
				{
					name: 'large-video.mp4',
					mimeType: 'video/mp4',
					size: 10240, // 10KB (simulating 50MB)
				},
			];

			for (const testCase of testCases) {
				// Use small buffer but mock the size
				const buffer = Buffer.alloc(100); // Small buffer to avoid memory issues
				const mockBinaryData: IDataObject = {
					data: buffer,
					mimeType: testCase.mimeType,
					fileName: testCase.name,
				};

				// Override the extractMediaFileInfo mock to return the test size
				(MediaUploader.extractMediaFileInfo as jest.Mock).mockReturnValueOnce({
					filename: testCase.name,
					mimeType: testCase.mimeType,
					size: testCase.size, // Use the test case size
					buffer: buffer,
				});

				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('data')
					.mockReturnValueOnce(false)
					.mockReturnValueOnce(true);

				mockAssertBinaryData.mockReturnValue(mockBinaryData);

				const mediaType = testCase.mimeType.startsWith('image/') ? 'image' : 'video';
				const mockUploadResult = {
					mediaId: `test-${mediaType}-id`,
					mediaType: mediaType as 'image' | 'video',
					status: 'succeeded' as const,
					uploadTime: 1000,
					fileSize: testCase.size,
					filename: testCase.name,
				};

				mockUploadMedia.mockResolvedValue(mockUploadResult);

				const result = await uploadMedia.call(mockExecuteFunctions, 0);

				expect(result.json.fileSize).toBe(testCase.size);
				expect(result.json.mediaType).toBe(mediaType);

				// Reset mocks for next iteration
				jest.clearAllMocks();
				mockAssertBinaryData = jest.fn();
				(mockExecuteFunctions.helpers.assertBinaryData as any) = mockAssertBinaryData;

				// Re-setup the mocks
				(MediaUploader.extractMediaFileInfo as jest.Mock).mockImplementation((binaryData) => ({
					filename: binaryData.fileName,
					mimeType: binaryData.mimeType,
					size: binaryData.data.length,
					buffer: binaryData.data,
				}));
				(MediaUploader.formatFileSize as jest.Mock).mockImplementation(
					(bytes) => `${Math.round(bytes / 1024)} KB`,
				);
				mockUploadMedia = jest.fn();
				(MediaUploader as any).mockImplementation(() => ({
					uploadMedia: mockUploadMedia,
				}));
			}
		});

		it('should handle API errors gracefully', async () => {
			const imageBuffer = Buffer.from('test-image');
			const mockBinaryData: IDataObject = {
				data: imageBuffer,
				mimeType: 'image/jpeg',
				fileName: 'error-test.jpg',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('data')
				.mockReturnValueOnce(false)
				.mockReturnValueOnce(true);

			mockAssertBinaryData.mockReturnValue(mockBinaryData);

			// Mock upload error
			mockUploadMedia.mockRejectedValue(new Error('Pinterest API Error: Rate limit exceeded'));

			await expect(uploadMedia.call(mockExecuteFunctions, 0)).rejects.toThrow(
				'Failed to upload media: Pinterest API Error: Rate limit exceeded',
			);
		});

		it('should validate file formats before upload', async () => {
			const unsupportedFormats = [
				{ name: 'test.bmp', mimeType: 'image/bmp' },
				{ name: 'test.tiff', mimeType: 'image/tiff' },
				{ name: 'test.avi', mimeType: 'video/avi' },
				{ name: 'test.wmv', mimeType: 'video/wmv' },
			];

			for (const format of unsupportedFormats) {
				const buffer = Buffer.from('test-data');
				const mockBinaryData: IDataObject = {
					data: buffer,
					mimeType: format.mimeType,
					fileName: format.name,
				};

				mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('data');
				mockAssertBinaryData.mockReturnValue(mockBinaryData);

				// Mock MediaUploader to throw validation error
				mockUploadMedia.mockRejectedValue(
					new Error(`Unsupported file format: ${format.name.split('.')[1]}`),
				);

				await expect(uploadMedia.call(mockExecuteFunctions, 0)).rejects.toThrow(
					'Unsupported file format',
				);

				// Reset mocks for next iteration
				jest.clearAllMocks();
				mockAssertBinaryData = jest.fn();
				(mockExecuteFunctions.helpers.assertBinaryData as any) = mockAssertBinaryData;

				// Re-setup the mocks
				(MediaUploader.extractMediaFileInfo as jest.Mock).mockImplementation((binaryData) => ({
					filename: binaryData.fileName,
					mimeType: binaryData.mimeType,
					size: binaryData.data.length,
					buffer: binaryData.data,
				}));
				(MediaUploader.formatFileSize as jest.Mock).mockImplementation(
					(bytes) => `${Math.round(bytes / 1024)} KB`,
				);
				mockUploadMedia = jest.fn();
				(MediaUploader as any).mockImplementation(() => ({
					uploadMedia: mockUploadMedia,
				}));
			}
		});

		it('should validate file sizes before upload', async () => {
			const oversizedCases = [
				{
					name: 'huge-image.jpg',
					mimeType: 'image/jpeg',
					size: 15 * 1024 * 1024, // 15MB (exceeds 10MB limit)
				},
				{
					name: 'huge-video.mp4',
					mimeType: 'video/mp4',
					size: 150 * 1024 * 1024, // 150MB (exceeds 100MB limit)
				},
			];

			for (const testCase of oversizedCases) {
				// Use small buffer but mock the size
				const buffer = Buffer.alloc(100);
				const mockBinaryData: IDataObject = {
					data: buffer,
					mimeType: testCase.mimeType,
					fileName: testCase.name,
				};

				// Override the extractMediaFileInfo mock to return the oversized file info
				(MediaUploader.extractMediaFileInfo as jest.Mock).mockReturnValueOnce({
					filename: testCase.name,
					mimeType: testCase.mimeType,
					size: testCase.size,
					buffer: buffer,
				});

				mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('data');
				mockAssertBinaryData.mockReturnValue(mockBinaryData);

				// Mock MediaUploader to throw size validation error
				const maxSize = testCase.mimeType.startsWith('image/') ? '10MB' : '100MB';
				mockUploadMedia.mockRejectedValue(
					new Error(`File size exceeds maximum allowed size of ${maxSize}`),
				);

				await expect(uploadMedia.call(mockExecuteFunctions, 0)).rejects.toThrow(
					'exceeds maximum allowed size',
				);

				// Reset mocks for next iteration
				jest.clearAllMocks();
				mockAssertBinaryData = jest.fn();
				(mockExecuteFunctions.helpers.assertBinaryData as any) = mockAssertBinaryData;

				// Re-setup the mocks
				(MediaUploader.extractMediaFileInfo as jest.Mock).mockImplementation((binaryData) => ({
					filename: binaryData.fileName,
					mimeType: binaryData.mimeType,
					size: binaryData.data.length,
					buffer: binaryData.data,
				}));
				(MediaUploader.formatFileSize as jest.Mock).mockImplementation(
					(bytes) => `${Math.round(bytes / 1024)} KB`,
				);
				mockUploadMedia = jest.fn();
				(MediaUploader as any).mockImplementation(() => ({
					uploadMedia: mockUploadMedia,
				}));
			}
		});

		it('should handle progress tracking throughout upload', async () => {
			const imageBuffer = Buffer.from('test-image-data');
			const mockBinaryData: IDataObject = {
				data: imageBuffer,
				mimeType: 'image/jpeg',
				fileName: 'progress-test.jpg',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('data')
				.mockReturnValueOnce(true) // trackProgress = true
				.mockReturnValueOnce(true);

			mockAssertBinaryData.mockReturnValue(mockBinaryData);

			const mockUploadResult = {
				mediaId: 'progress-test-id',
				mediaType: 'image' as const,
				status: 'succeeded' as const,
				uploadTime: 1000,
				fileSize: imageBuffer.length,
				filename: 'progress-test.jpg',
			};

			// Mock the upload method to call the progress callback
			mockUploadMedia.mockImplementation(async (fileInfo, progressCallback) => {
				if (progressCallback) {
					progressCallback({
						loaded: fileInfo.size,
						total: fileInfo.size,
						percentage: 100,
						status: 'completed',
					});
				}
				return mockUploadResult;
			});

			const result = await uploadMedia.call(mockExecuteFunctions, 0);

			// Should include progress information
			expect(result.json).toHaveProperty('progress');
			expect(result.json.progress).toMatchObject({
				loaded: expect.any(Number),
				total: expect.any(Number),
				percentage: expect.any(Number),
				status: expect.any(String),
			});
		});
	});

	describe('Error Handling Integration', () => {
		it('should handle network timeouts', async () => {
			const imageBuffer = Buffer.from('test-image');
			const mockBinaryData: IDataObject = {
				data: imageBuffer,
				mimeType: 'image/jpeg',
				fileName: 'timeout-test.jpg',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('data')
				.mockReturnValueOnce(false)
				.mockReturnValueOnce(true);

			mockAssertBinaryData.mockReturnValue(mockBinaryData);

			// Mock timeout error
			const timeoutError = new Error('Request timeout');
			timeoutError.name = 'TimeoutError';
			mockUploadMedia.mockRejectedValue(timeoutError);

			await expect(uploadMedia.call(mockExecuteFunctions, 0)).rejects.toThrow(
				'Failed to upload media: Request timeout',
			);
		});

		it('should handle authentication errors', async () => {
			const imageBuffer = Buffer.from('test-image');
			const mockBinaryData: IDataObject = {
				data: imageBuffer,
				mimeType: 'image/jpeg',
				fileName: 'auth-test.jpg',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('data')
				.mockReturnValueOnce(false)
				.mockReturnValueOnce(true);

			mockAssertBinaryData.mockReturnValue(mockBinaryData);

			// Mock authentication error
			const authError = new Error('Invalid access token');
			authError.name = 'AuthenticationError';
			mockUploadMedia.mockRejectedValue(authError);

			await expect(uploadMedia.call(mockExecuteFunctions, 0)).rejects.toThrow(
				'Failed to upload media: Invalid access token',
			);
		});
	});
});
