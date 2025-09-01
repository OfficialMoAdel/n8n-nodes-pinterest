import { MediaUploader } from '../../../utils/MediaUploader';

describe('Media Operations', () => {
	describe('File validation', () => {
		it('should validate supported image formats', () => {
			const supportedImages = ['test.jpg', 'test.jpeg', 'test.png', 'test.gif'];
			supportedImages.forEach((filename) => {
				expect(MediaUploader.isSupportedFormat(filename)).toBe(true);
			});
		});

		it('should validate supported video formats', () => {
			const supportedVideos = ['test.mp4', 'test.mov'];
			supportedVideos.forEach((filename) => {
				expect(MediaUploader.isSupportedFormat(filename)).toBe(true);
			});
		});

		it('should reject unsupported formats', () => {
			const unsupportedFiles = ['test.bmp', 'test.tiff', 'test.avi', 'test.wmv', 'test.txt'];
			unsupportedFiles.forEach((filename) => {
				expect(MediaUploader.isSupportedFormat(filename)).toBe(false);
			});
		});
	});

	describe('File size formatting', () => {
		it('should format file sizes correctly', () => {
			expect(MediaUploader.formatFileSize(1024)).toBe('1 KB');
			expect(MediaUploader.formatFileSize(1024 * 1024)).toBe('1 MB');
			expect(MediaUploader.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
		});
	});

	describe('Binary data extraction', () => {
		it('should extract file information from binary data', () => {
			const testData = Buffer.from('test file content');
			const binaryData = {
				data: testData,
				mimeType: 'image/jpeg',
				fileName: 'test.jpg',
			};

			const result = MediaUploader.extractMediaFileInfo(binaryData);

			expect(result.filename).toBe('test.jpg');
			expect(result.mimeType).toBe('image/jpeg');
			expect(result.size).toBe(testData.length);
			expect(result.buffer).toEqual(testData);
		});

		it('should handle missing filename', () => {
			const binaryData = {
				data: Buffer.from('test'),
				mimeType: 'image/jpeg',
			};

			const result = MediaUploader.extractMediaFileInfo(binaryData);
			expect(result.filename).toBe('upload');
		});
	});
});
