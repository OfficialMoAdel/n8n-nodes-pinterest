import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PinterestApiClient } from '../../utils/PinterestApiClient';
import type { CreatePinRequest } from '../../utils/types';
import { DataTransformer } from '../../utils/DataTransformer';
import { MediaUploader, type MediaFileInfo } from '../../utils/MediaUploader';

/**
 * Create pin operation handler
 * Supports both media URL and file upload for images and videos
 */
export async function createPin(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	// Get required parameters
	const boardId = this.getNodeParameter('boardId', itemIndex) as string;
	const mediaSource = this.getNodeParameter('mediaSource', itemIndex) as string;

	// Validate required fields
	if (!boardId) {
		throw new NodeOperationError(this.getNode(), 'Board ID is required for creating a pin');
	}

	if (!mediaSource || !['url', 'upload'].includes(mediaSource)) {
		throw new NodeOperationError(this.getNode(), 'Media source must be either "url" or "upload"');
	}

	// Get optional parameters
	const title = this.getNodeParameter('title', itemIndex, '') as string;
	const description = this.getNodeParameter('description', itemIndex, '') as string;
	const link = this.getNodeParameter('link', itemIndex, '') as string;
	const altText = this.getNodeParameter('altText', itemIndex, '') as string;

	let mediaId: string | undefined;
	let mediaUrl: string | undefined;
	let sourceType: 'image_url' | 'video_url' | 'image_upload';

	// Handle media source
	if (mediaSource === 'upload') {
		// Handle file upload using MediaUploader
		const binaryPropertyName = this.getNodeParameter(
			'binaryPropertyName',
			itemIndex,
			'data',
		) as string;

		// Get binary data from input
		const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);

		// Extract media file information
		const mediaFileInfo: MediaFileInfo = MediaUploader.extractMediaFileInfo(binaryData);

		// Create media uploader and upload file
		const mediaUploader = new MediaUploader(this);
		const uploadResult = await mediaUploader.uploadMedia(mediaFileInfo);

		if (uploadResult.status !== 'succeeded') {
			throw new NodeOperationError(
				this.getNode(),
				`Media upload failed with status: ${uploadResult.status}`,
			);
		}

		mediaId = uploadResult.mediaId;
		sourceType = 'image_upload'; // Pinterest API uses image_upload for both images and videos when uploading
	} else {
		// Handle URL source
		mediaUrl = this.getNodeParameter('mediaUrl', itemIndex) as string;

		if (!mediaUrl) {
			throw new NodeOperationError(this.getNode(), 'Media URL is required when using URL source');
		}

		// Validate URL format
		if (!isValidUrl(mediaUrl)) {
			throw new NodeOperationError(this.getNode(), 'Invalid media URL format');
		}

		// Determine source type based on URL
		sourceType = isVideoUrl(mediaUrl) ? 'video_url' : 'image_url';
	}

	// Prepare pin creation request
	const pinData: CreatePinRequest = {
		board_id: boardId,
		media_source: {
			source_type: sourceType,
			url: mediaUrl,
			media_id: mediaId,
		},
		title: title || undefined,
		description: description || undefined,
		link: link || undefined,
		alt_text: altText || undefined,
	};

	// Create the pin
	try {
		const response = await apiClient.createPin(pinData);

		// Transform response to n8n format
		const transformedData = DataTransformer.transformPinResponse(response);

		return {
			json: transformedData,
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Failed to create pin: ${error.message}`, {
			itemIndex,
		});
	}
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Determine if URL is for a video based on file extension
 */
function isVideoUrl(url: string): boolean {
	const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm'];
	const urlLower = url.toLowerCase();
	return videoExtensions.some((ext) => urlLower.includes(ext));
}
