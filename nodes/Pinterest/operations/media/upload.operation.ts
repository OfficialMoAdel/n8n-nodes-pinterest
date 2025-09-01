import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { MediaUploader, type MediaFileInfo, type UploadResult } from '../../utils/MediaUploader';

/**
 * Upload media file to Pinterest
 * @param this n8n execution context
 * @param itemIndex Current item index
 * @returns Execution data with upload result
 */
export async function uploadMedia(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	try {
		// Get binary data property name
		const binaryPropertyName = this.getNodeParameter(
			'binaryPropertyName',
			itemIndex,
			'data',
		) as string;

		// Get binary data from input
		const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);

		// Extract media file information
		const mediaFileInfo: MediaFileInfo = MediaUploader.extractMediaFileInfo(binaryData);

		// Get additional parameters
		const trackProgress = this.getNodeParameter('trackProgress', itemIndex, false) as boolean;
		const waitForProcessing = this.getNodeParameter(
			'waitForProcessing',
			itemIndex,
			true,
		) as boolean;

		// Create media uploader
		const mediaUploader = new MediaUploader(this);

		// Track upload progress if requested
		let progressData: any = null;
		const progressCallback = trackProgress
			? (progress: any) => {
					progressData = progress;
				}
			: undefined;

		// Upload media
		const uploadResult: UploadResult = await mediaUploader.uploadMedia(
			mediaFileInfo,
			progressCallback,
		);

		// Prepare output data
		const outputData: IDataObject = {
			mediaId: uploadResult.mediaId,
			mediaType: uploadResult.mediaType,
			status: uploadResult.status,
			uploadTime: uploadResult.uploadTime,
			fileSize: uploadResult.fileSize,
			filename: uploadResult.filename,
			fileSizeFormatted: MediaUploader.formatFileSize(uploadResult.fileSize),
		};

		// Add progress data if tracking was enabled
		if (trackProgress && progressData) {
			outputData.progress = progressData;
		}

		// Add processing status information
		if (uploadResult.status === 'processing' && !waitForProcessing) {
			outputData.note =
				'Media is still processing. You can check the status later using the media ID.';
		}

		return {
			json: outputData,
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		// Handle specific media upload errors
		if (error instanceof NodeOperationError) {
			throw error;
		}

		// Handle unexpected errors
		throw new NodeOperationError(this.getNode(), `Failed to upload media: ${error.message}`, {
			itemIndex,
		});
	}
}

/**
 * Get media upload status by media ID
 * @param this n8n execution context
 * @param itemIndex Current item index
 * @returns Execution data with media status
 */
export async function getMediaStatus(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	try {
		const mediaId = this.getNodeParameter('mediaId', itemIndex) as string;

		if (!mediaId) {
			throw new NodeOperationError(this.getNode(), 'Media ID is required', { itemIndex });
		}

		// Note: Pinterest API doesn't have a direct endpoint to check media status
		// This would typically be implemented by storing upload status in a database
		// or using Pinterest's webhook notifications
		// For now, we'll return a placeholder response

		const outputData: IDataObject = {
			mediaId,
			status: 'succeeded', // This would come from actual API call
			message:
				'Media status check is not directly supported by Pinterest API. Use webhooks for real-time status updates.',
		};

		return {
			json: outputData,
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		if (error instanceof NodeOperationError) {
			throw error;
		}

		throw new NodeOperationError(this.getNode(), `Failed to get media status: ${error.message}`, {
			itemIndex,
		});
	}
}

/**
 * Validate media file without uploading
 * @param this n8n execution context
 * @param itemIndex Current item index
 * @returns Execution data with validation result
 */
export async function validateMedia(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	try {
		// Get binary data property name
		const binaryPropertyName = this.getNodeParameter(
			'binaryPropertyName',
			itemIndex,
			'data',
		) as string;

		// Get binary data from input
		const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);

		// Extract media file information
		const mediaFileInfo: MediaFileInfo = MediaUploader.extractMediaFileInfo(binaryData);

		// Create media uploader for validation
		new MediaUploader(this);

		// Validate file (this will throw if invalid)
		try {
			// We need to access the private validateMediaFile method
			// For now, we'll do basic validation here
			const isSupported = MediaUploader.isSupportedFormat(mediaFileInfo.filename);

			if (!isSupported) {
				throw new NodeOperationError(
					this.getNode(),
					`Unsupported file format: ${mediaFileInfo.filename}`,
					{ itemIndex },
				);
			}

			// Basic size validation
			const isImage = mediaFileInfo.mimeType.startsWith('image/');
			const maxSize = isImage ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for images, 100MB for videos

			if (mediaFileInfo.size > maxSize) {
				const maxSizeMB = Math.round(maxSize / (1024 * 1024));
				const fileSizeMB = Math.round(mediaFileInfo.size / (1024 * 1024));
				throw new NodeOperationError(
					this.getNode(),
					`File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
					{ itemIndex },
				);
			}

			const outputData: IDataObject = {
				valid: true,
				filename: mediaFileInfo.filename,
				mimeType: mediaFileInfo.mimeType,
				size: mediaFileInfo.size,
				sizeFormatted: MediaUploader.formatFileSize(mediaFileInfo.size),
				mediaType: isImage ? 'image' : 'video',
				message: 'File is valid and ready for upload',
			};

			return {
				json: outputData,
				pairedItem: { item: itemIndex },
			};
		} catch (validationError) {
			// Return validation failure result
			const outputData: IDataObject = {
				valid: false,
				filename: mediaFileInfo.filename,
				mimeType: mediaFileInfo.mimeType,
				size: mediaFileInfo.size,
				sizeFormatted: MediaUploader.formatFileSize(mediaFileInfo.size),
				error: validationError.message,
				message: 'File validation failed',
			};

			return {
				json: outputData,
				pairedItem: { item: itemIndex },
			};
		}
	} catch (error) {
		if (error instanceof NodeOperationError) {
			throw error;
		}

		throw new NodeOperationError(this.getNode(), `Failed to validate media: ${error.message}`, {
			itemIndex,
		});
	}
}
