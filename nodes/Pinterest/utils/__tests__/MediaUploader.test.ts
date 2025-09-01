import {
	MediaUploader,
	SUPPORTED_IMAGE_FORMATS,
	SUPPORTED_VIDEO_FORMATS,
	FILE_SIZE_LIMITS,
} from '../MediaUploader';

describe('MediaUploader', () => {
	describe('Static utility methods', () => {
		describe('formatFileSize', () => {
			it('should format bytes correctly', () => {
				expect(MediaUploader.formatFileSize(500)).toBe('500 B');
				expect(MediaUploader.formatFileSize(1024)).toBe('1 KB');
				expect(MediaUploader.formatFileSize(1536)).toBe('1.5 KB');
				expect(MediaUploader.formatFileSize(1024 * 1024)).toBe('1 MB');
				expect(MediaUploader.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
			});
		});

		describe('isSupportedFormat', () => {
			it('should return true for supported image formats', () => {
				SUPPORTED_IMAGE_FORMATS.forEach((format) => {
					expect(MediaUploader.isSupportedFormat(`test.${format}`)).toBe(true);
					expect(MediaUploader.isSupportedFormat(`test.${format.toUpperCase()}`)).toBe(true);
				});
			});

			it('should return true for supported video formats', () => {
				SUPPORTED_VIDEO_FORMATS.forEach((format) => {
					expect(MediaUploader.isSupportedFormat(`test.${format}`)).toBe(true);
					expect(MediaUploader.isSupportedFormat(`test.${format.toUpperCase()}`)).toBe(true);
				});
			});

			it('should return false for unsupported formats', () => {
				expect(MediaUploader.isSupportedFormat('test.bmp')).toBe(false);
				expect(MediaUploader.isSupportedFormat('test.tiff')).toBe(false);
				expect(MediaUploader.isSupportedFormat('test.avi')).toBe(false);
				expect(MediaUploader.isSupportedFormat('test.wmv')).toBe(false);
			});

			it('should handle files without extensions', () => {
				expect(MediaUploader.isSupportedFormat('test')).toBe(false);
			});
		});

		describe('extractMediaFileInfo', () => {
			it('should extract media file info from binary data', () => {
				const binaryData = {
					data: Buffer.from('test image data'),
					mimeType: 'image/jpeg',
					fileName: 'test.jpg',
				};

				const result = MediaUploader.extractMediaFileInfo(binaryData);

				expect(result).toEqual({
					filename: 'test.jpg',
					mimeType: 'image/jpeg',
					size: 15, // Buffer.from('test image data').length
					buffer: expect.any(Buffer),
				});
			});

			it('should handle base64 encoded data', () => {
				const testData = 'test image data';
				const base64Data = Buffer.from(testData).toString('base64');

				const binaryData = {
					data: base64Data,
					mimeType: 'image/png',
					fileName: 'test.png',
				};

				const result = MediaUploader.extractMediaFileInfo(binaryData);

				expect(result.buffer.toString()).toBe(testData);
				expect(result.filename).toBe('test.png');
				expect(result.mimeType).toBe('image/png');
			});

			it('should use default filename when not provided', () => {
				const binaryData = {
					data: Buffer.from('test'),
					mimeType: 'image/jpeg',
				};

				const result = MediaUploader.extractMediaFileInfo(binaryData);

				expect(result.filename).toBe('upload');
			});

			it('should throw error for invalid binary data', () => {
				const binaryData = {
					mimeType: 'image/jpeg',
					// missing data
				};

				expect(() => MediaUploader.extractMediaFileInfo(binaryData)).toThrow(
					'Invalid binary data: missing data or mimeType',
				);
			});
		});
	});

	describe('Constants', () => {
		it('should have correct supported image formats', () => {
			expect(SUPPORTED_IMAGE_FORMATS).toEqual(['jpeg', 'jpg', 'png', 'gif']);
		});

		it('should have correct supported video formats', () => {
			expect(SUPPORTED_VIDEO_FORMATS).toEqual(['mp4', 'mov']);
		});

		it('should have correct file size limits', () => {
			expect(FILE_SIZE_LIMITS.image).toBe(10 * 1024 * 1024); // 10MB
			expect(FILE_SIZE_LIMITS.video).toBe(100 * 1024 * 1024); // 100MB
		});
	});
});
