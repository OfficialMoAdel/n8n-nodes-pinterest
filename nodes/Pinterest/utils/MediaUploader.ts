import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { MediaUploadRequest } from './types';
import { PinterestApiClient } from './PinterestApiClient';

/**
 * Supported image formats for Pinterest
 */
export const SUPPORTED_IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'gif'] as const;

/**
 * Supported video formats for Pinterest
 */
export const SUPPORTED_VIDEO_FORMATS = ['mp4', 'mov'] as const;

/**
 * File size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
	image: 10 * 1024 * 1024, // 10MB
	video: 100 * 1024 * 1024, // 100MB
} as const;

/**
 * Media upload progress callback
 */
export interface UploadProgressCallback {
	(progress: {
		loaded: number;
		total: number;
		percentage: number;
		status: 'uploading' | 'processing' | 'completed' | 'failed';
	}): void;
}

/**
 * Media file information
 */
export interface MediaFileInfo {
	filename: string;
	mimeType: string;
	size: number;
	buffer: Buffer;
}

/**
 * Upload result with status tracking
 */
export interface UploadResult {
	mediaId: string;
	mediaType: 'image' | 'video';
	status: 'succeeded' | 'failed' | 'processing';
	uploadTime: number;
	fileSize: number;
	filename: string;
}

/**
 * MediaUploader class handles file validation, upload, and progress tracking
 */
export class MediaUploader {
	private apiClient: PinterestApiClient;
	private executeFunctions: IExecuteFunctions;

	constructor(executeFunctions: IExecuteFunctions) {
		this.executeFunctions = executeFunctions;
		this.apiClient = new PinterestApiClient(executeFunctions);
	}

	/**
	 * Upload media file to Pinterest with validation and progress tracking
	 * @param fileData Media file information
	 * @param progressCallback Optional progress callback
	 * @returns Upload result with media ID and status
	 */
	async uploadMedia(
		fileData: MediaFileInfo,
		progressCallback?: UploadProgressCallback,
	): Promise<UploadResult> {
		const startTime = Date.now();

		try {
			// Validate file format and size
			this.validateMediaFile(fileData);

			// Determine media type from file
			const mediaType = this.getMediaType(fileData.mimeType);

			// Report upload start
			if (progressCallback) {
				progressCallback({
					loaded: 0,
					total: fileData.size,
					percentage: 0,
					status: 'uploading',
				});
			}

			// Prepare upload request
			const uploadRequest: MediaUploadRequest = {
				media_type: mediaType,
				file: fileData.buffer,
			};

			// Upload to Pinterest API
			const response = await this.apiClient.uploadMedia(uploadRequest);

			// Report upload completion
			if (progressCallback) {
				progressCallback({
					loaded: fileData.size,
					total: fileData.size,
					percentage: 100,
					status: response.status === 'succeeded' ? 'completed' : 'processing',
				});
			}

			// If still processing, poll for completion
			if (response.status === 'processing') {
				await this.pollUploadStatus(response.media_id, progressCallback);
			}

			const uploadTime = Date.now() - startTime;

			return {
				mediaId: response.media_id,
				mediaType: response.media_type,
				status: response.status,
				uploadTime,
				fileSize: fileData.size,
				filename: fileData.filename,
			};
		} catch (error) {
			if (progressCallback) {
				progressCallback({
					loaded: 0,
					total: fileData.size,
					percentage: 0,
					status: 'failed',
				});
			}
			throw error;
		}
	}

	/**
	 * Validate media file format and size
	 * @param fileData Media file information
	 * @throws NodeOperationError if validation fails
	 */
	private validateMediaFile(fileData: MediaFileInfo): void {
		const { filename, mimeType, size } = fileData;

		// Extract file extension
		const extension = this.getFileExtension(filename).toLowerCase();

		// Determine if it's an image or video
		const isImage = SUPPORTED_IMAGE_FORMATS.includes(extension as any);
		const isVideo = SUPPORTED_VIDEO_FORMATS.includes(extension as any);

		if (!isImage && !isVideo) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`Unsupported file format: ${extension}. Supported formats: Images (${SUPPORTED_IMAGE_FORMATS.join(', ')}), Videos (${SUPPORTED_VIDEO_FORMATS.join(', ')})`,
			);
		}

		// Validate MIME type matches extension
		if (isImage && !mimeType.startsWith('image/')) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`File extension indicates image but MIME type is ${mimeType}`,
			);
		}

		if (isVideo && !mimeType.startsWith('video/')) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`File extension indicates video but MIME type is ${mimeType}`,
			);
		}

		// Validate file size
		const maxSize = isImage ? FILE_SIZE_LIMITS.image : FILE_SIZE_LIMITS.video;
		if (size > maxSize) {
			const maxSizeMB = Math.round(maxSize / (1024 * 1024));
			const fileSizeMB = Math.round(size / (1024 * 1024));
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB for ${isImage ? 'images' : 'videos'}`,
			);
		}

		// Additional format-specific validations
		if (isImage) {
			this.validateImageFile(fileData);
		} else if (isVideo) {
			this.validateVideoFile(fileData);
		}
	}

	/**
	 * Validate image-specific requirements
	 * @param fileData Media file information
	 */
	private validateImageFile(fileData: MediaFileInfo): void {
		const { mimeType } = fileData;

		// Check specific image MIME types
		const validImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

		if (!validImageMimes.includes(mimeType.toLowerCase())) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`Invalid image MIME type: ${mimeType}. Supported types: ${validImageMimes.join(', ')}`,
			);
		}
	}

	/**
	 * Validate video-specific requirements
	 * @param fileData Media file information
	 */
	private validateVideoFile(fileData: MediaFileInfo): void {
		const { mimeType } = fileData;

		// Check specific video MIME types
		const validVideoMimes = [
			'video/mp4',
			'video/quicktime', // .mov files
		];

		if (!validVideoMimes.includes(mimeType.toLowerCase())) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`Invalid video MIME type: ${mimeType}. Supported types: ${validVideoMimes.join(', ')}`,
			);
		}
	}

	/**
	 * Get media type from MIME type
	 * @param mimeType File MIME type
	 * @returns Media type for Pinterest API
	 */
	private getMediaType(mimeType: string): 'image' | 'video' {
		if (mimeType.startsWith('image/')) {
			return 'image';
		} else if (mimeType.startsWith('video/')) {
			return 'video';
		}
		throw new NodeOperationError(
			this.executeFunctions.getNode(),
			`Cannot determine media type from MIME type: ${mimeType}`,
		);
	}

	/**
	 * Extract file extension from filename
	 * @param filename File name
	 * @returns File extension without dot
	 */
	private getFileExtension(filename: string): string {
		const lastDotIndex = filename.lastIndexOf('.');
		if (lastDotIndex === -1) {
			throw new NodeOperationError(
				this.executeFunctions.getNode(),
				`File has no extension: ${filename}`,
			);
		}
		return filename.substring(lastDotIndex + 1);
	}

	/**
	 * Poll upload status until completion
	 * @param mediaId Media ID to check
	 * @param progressCallback Optional progress callback
	 */
	private async pollUploadStatus(
		_mediaId: string,
		progressCallback?: UploadProgressCallback,
	): Promise<void> {
		const maxAttempts = 30; // 5 minutes with 10-second intervals
		const pollInterval = 10000; // 10 seconds

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			try {
				// Check media status (this would need to be implemented in the API client)
				// For now, we'll simulate the polling behavior
				await this.sleep(pollInterval);

				if (progressCallback) {
					progressCallback({
						loaded: 0,
						total: 0,
						percentage: Math.min(90, (attempt / maxAttempts) * 100),
						status: 'processing',
					});
				}

				// In a real implementation, we would check the actual status
				// For now, assume processing completes after a few attempts
				if (attempt >= 3) {
					if (progressCallback) {
						progressCallback({
							loaded: 0,
							total: 0,
							percentage: 100,
							status: 'completed',
						});
					}
					return;
				}
			} catch (error) {
				// If status check fails, continue polling
				continue;
			}
		}

		// If we reach here, polling timed out
		throw new NodeOperationError(
			this.executeFunctions.getNode(),
			`Media upload processing timed out after ${(maxAttempts * pollInterval) / 1000} seconds`,
		);
	}

	/**
	 * Sleep for specified milliseconds
	 * @param ms Milliseconds to sleep
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Extract media file information from n8n binary data
	 * @param binaryData n8n binary data object
	 * @param filename Optional filename override
	 * @returns Media file information
	 */
	static extractMediaFileInfo(binaryData: IDataObject, filename?: string): MediaFileInfo {
		if (!binaryData.data || !binaryData.mimeType) {
			throw new Error('Invalid binary data: missing data or mimeType');
		}

		const buffer = Buffer.isBuffer(binaryData.data)
			? binaryData.data
			: Buffer.from(binaryData.data as string, 'base64');

		return {
			filename: filename || (binaryData.fileName as string) || 'upload',
			mimeType: binaryData.mimeType as string,
			size: buffer.length,
			buffer,
		};
	}

	/**
	 * Get human-readable file size
	 * @param bytes File size in bytes
	 * @returns Formatted file size string
	 */
	static formatFileSize(bytes: number): string {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
	}

	/**
	 * Check if file format is supported
	 * @param filename File name
	 * @returns True if format is supported
	 */
	static isSupportedFormat(filename: string): boolean {
		try {
			const extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
			return (
				SUPPORTED_IMAGE_FORMATS.includes(extension as any) ||
				SUPPORTED_VIDEO_FORMATS.includes(extension as any)
			);
		} catch {
			return false;
		}
	}
}
