import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

/**
 * Pinterest Node Description with comprehensive UI elements
 * Provides dynamic field visibility, validation, tooltips, and user-friendly organization
 */
export const PinterestDescription: INodeTypeDescription = {
	displayName: 'Pinterest',
	name: 'pinterest',
	icon: 'file:pinterest.svg',
	group: ['transform'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description:
		'Interact with Pinterest API v5 to manage pins, boards, user profiles, and search content',
	defaults: {
		name: 'Pinterest',
	},
	inputs: [NodeConnectionType.Main],
	outputs: [NodeConnectionType.Main],
	credentials: [
		{
			name: 'pinterestOAuth2Api',
			required: true,
		},
	],
	requestDefaults: {
		baseURL: 'https://api.pinterest.com/v5',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
	},
	properties: [
		// ================================
		// RESOURCE SELECTION
		// ================================
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Board',
					value: 'board',
					description: 'Create, update, delete, and organize Pinterest boards and collections',
				},
				{
					name: 'Media',
					value: 'media',
					description: 'Upload images and videos to Pinterest for use in pins',
				},
				{
					name: 'Pin',
					value: 'pin',
					description: 'Create, update, delete, and manage Pinterest pins with media content',
				},
				{
					name: 'Search',
					value: 'search',
					description: 'Search Pinterest content including pins, boards, and trending topics',
				},
				{
					name: 'User',
					value: 'user',
					description: 'Access user profile information, analytics, and account data',
				},
			],
			default: 'pin',
			description: 'Choose the Pinterest resource you want to work with',
			hint: 'Select the type of Pinterest content you want to manage or access',
		},

		// ================================
		// PIN OPERATIONS
		// ================================
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['pin'],
				},
			},
			options: [
				{
					name: 'Bulk Operations',
					value: 'bulk',
					description: 'Perform operations on multiple pins efficiently',
					action: 'Bulk pin operations',
				},
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new pin with image or video content on a board',
					action: 'Create a pin',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Permanently remove a pin from Pinterest',
					action: 'Delete a pin',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Retrieve detailed information about a specific pin',
					action: 'Get a pin',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Modify pin title, description, board assignment, or other properties',
					action: 'Update a pin',
				},
			],
			default: 'create',
			hint: 'Pin operations allow you to manage your Pinterest content programmatically',
		},

		// ================================
		// BOARD OPERATIONS
		// ================================
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['board'],
				},
			},
			options: [
				{
					name: 'Bulk Operations',
					value: 'bulk',
					description: 'Perform operations on multiple boards efficiently',
					action: 'Bulk board operations',
				},
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new board with custom privacy settings and description',
					action: 'Create a board',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Permanently remove a board and all its contained pins',
					action: 'Delete a board',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Retrieve board information, statistics, and metadata',
					action: 'Get a board',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Modify board name, description, privacy settings, or cover image',
					action: 'Update a board',
				},
			],
			default: 'create',
			hint: 'Boards are collections that organize your pins by topic or theme',
		},

		// ================================
		// USER OPERATIONS
		// ================================
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['user'],
				},
			},
			options: [
				{
					name: 'Get Profile',
					value: 'getProfile',
					description: 'Retrieve your Pinterest account information and profile details',
					action: 'Get user profile',
				},
				{
					name: 'Get Analytics',
					value: 'getAnalytics',
					description: 'Access account-level analytics including impressions and engagement',
					action: 'Get user analytics',
				},
				{
					name: 'Get Pin Analytics',
					value: 'getPinAnalytics',
					description: 'Retrieve detailed performance metrics for a specific pin',
					action: 'Get pin analytics',
				},
				{
					name: 'Get Board Analytics',
					value: 'getBoardAnalytics',
					description: 'Access performance data and insights for a specific board',
					action: 'Get board analytics',
				},
			],
			default: 'getProfile',
			hint: 'Analytics operations require a Pinterest Business account',
		},

		// ================================
		// SEARCH OPERATIONS
		// ================================
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['search'],
				},
			},
			options: [
				{
					name: 'Search Pins',
					value: 'pins',
					description: 'Find pins using keywords with advanced filtering options',
					action: 'Search pins',
				},
				{
					name: 'Search Boards',
					value: 'boards',
					description: 'Discover boards by name, description, and topic',
					action: 'Search boards',
				},
				{
					name: 'Get Trending',
					value: 'trending',
					description: 'Access currently trending pins and popular topics',
					action: 'Get trending content',
				},
			],
			default: 'pins',
			hint: 'Search operations help you discover content and trends on Pinterest',
		},

		// ================================
		// MEDIA OPERATIONS
		// ================================
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['media'],
				},
			},
			options: [
				{
					name: 'Upload',
					value: 'upload',
					description: 'Upload image or video files to Pinterest for use in pins',
					action: 'Upload media',
				},
			],
			default: 'upload',
			description: 'Upload media files to Pinterest',
			hint: 'Uploaded media can be used when creating pins. Supports images (10MB max) and videos (100MB max)',
		},

		// ================================
		// PIN OPERATION FIELDS
		// ================================

		// Pin Create - Board Selection
		{
			displayName: 'Board ID',
			name: 'boardId',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['create'],
				},
			},
			default: '',
			description: 'The unique identifier of the board where the pin will be created',
			placeholder: '123456789012345678',
			hint: 'You can find the board ID in the Pinterest URL or by using the Board Get operation. Board IDs are typically 18-digit numbers.',
			validateType: 'string',
			typeOptions: {
				minLength: 1,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]{10,20}$',
							errorMessage: 'Board ID must be a numeric string (typically 18 digits)',
						},
					},
				],
			},
		},

		// Pin Create - Media Source Selection
		{
			displayName: 'Media Source',
			name: 'mediaSource',
			type: 'options',
			required: true,
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['create'],
				},
			},
			options: [
				{
					name: 'URL',
					value: 'url',
					description: 'Use an image or video URL from the web (recommended for web content)',
				},
				{
					name: 'Upload File',
					value: 'upload',
					description: 'Upload an image or video file from your local system or workflow',
				},
			],
			default: 'url',
			description: 'Choose how you want to provide the media content for your pin',
			hint: 'URL is faster for web content, Upload is better for processed files',
		},

		// Pin Create - Media URL
		{
			displayName: 'Media URL',
			name: 'mediaUrl',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['create'],
					mediaSource: ['url'],
				},
			},
			default: '',
			description: 'Direct URL to the image or video file (must be publicly accessible)',
			placeholder: 'https://example.com/image.jpg',
			hint: 'Supported formats: JPEG, PNG, GIF (images), MP4, MOV (videos). URL must be HTTPS and publicly accessible.',
			validateType: 'string',
			typeOptions: {
				minLength: 1,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^https?://.*\\.(jpg|jpeg|png|gif|mp4|mov)$',
							errorMessage:
								'URL must be a valid HTTP/HTTPS link to an image (JPG, PNG, GIF) or video (MP4, MOV) file',
						},
					},
				],
			},
		},

		// Pin Create - Binary Property for Upload
		{
			displayName: 'Binary Property Name',
			name: 'binaryPropertyName',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['create'],
					mediaSource: ['upload'],
				},
			},
			default: 'data',
			description: 'Name of the binary property containing the media file from previous node',
			placeholder: 'data',
			hint: 'This should match the property name from a previous node that provides binary data',
		},

		// Pin Content Fields Section
		{
			displayName: 'Pin Content & Details',
			name: 'pinContentNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['create', 'update'],
				},
			},
			default:
				"Configure your pin's content, including title, description, and destination link. All fields except title are optional but recommended for better engagement.",
			typeOptions: {
				theme: 'info',
			},
		},

		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['create', 'update'],
				},
			},
			default: '',
			description: 'Pin title (optional but highly recommended for SEO and discoverability)',
			placeholder: 'Enter a descriptive and engaging title...',
			hint: 'Good titles help your pins get discovered in search results',
			typeOptions: {
				maxLength: 100,
			},
		},

		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			typeOptions: {
				rows: 4,
				maxLength: 500,
			},
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['create', 'update'],
				},
			},
			default: '',
			description: 'Pin description with hashtags and mentions (up to 500 characters)',
			placeholder: 'Describe your pin content and add relevant #hashtags...',
			hint: 'Use hashtags (#) and mentions (@) to increase discoverability',
		},

		{
			displayName: 'Destination Link',
			name: 'link',
			type: 'string',
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['create', 'update'],
				},
			},
			default: '',
			description: 'URL where users will be directed when they click on the pin (optional)',
			placeholder: 'https://your-website.com/page',
			hint: 'Adding a link can drive traffic to your website or blog',
		},

		{
			displayName: 'Alt Text',
			name: 'altText',
			type: 'string',
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['create', 'update'],
				},
			},
			default: '',
			description: 'Alternative text for accessibility and screen readers (recommended)',
			placeholder: 'Describe the visual content of your pin...',
			hint: 'Alt text helps visually impaired users understand your content',
			typeOptions: {
				maxLength: 500,
			},
		},

		// Pin Get/Update/Delete Fields
		{
			displayName: 'Pin ID',
			name: 'pinId',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['get', 'update', 'delete'],
				},
			},
			default: '',
			description: 'The unique identifier of the pin',
			placeholder: 'e.g., 123456789012345678',
			hint: 'Pin IDs are typically 18-digit numbers. You can find them in Pinterest URLs or from previous operations.',
			validateType: 'string',
			typeOptions: {
				minLength: 1,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]{10,20}$',
							errorMessage: 'Pin ID must be a numeric string (typically 18 digits)',
						},
					},
				],
			},
		},

		// Board Configuration Notice
		{
			displayName: 'Board Configuration',
			name: 'boardConfigNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: ['board'],
					operation: ['create', 'update'],
				},
			},
			default:
				'Configure your board settings. Board name is required, while description and privacy settings help organize and control access to your content.',
			typeOptions: {
				theme: 'info',
			},
		},

		// Board Create Fields
		{
			displayName: 'Board Name',
			name: 'name',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['board'],
					operation: ['create', 'update'],
				},
			},
			default: '',
			description: 'Name of the board (required, 1-180 characters)',
			placeholder: 'My Awesome Board',
			hint: "Choose a descriptive name that reflects the board's content theme",
			validateType: 'string',
			typeOptions: {
				minLength: 1,
				maxLength: 180,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^.{1,180}$',
							errorMessage: 'Board name must be between 1 and 180 characters',
						},
					},
				],
			},
		},
		{
			displayName: 'Board Description',
			name: 'description',
			type: 'string',
			typeOptions: {
				rows: 2,
			},
			displayOptions: {
				show: {
					resource: ['board'],
					operation: ['create', 'update'],
				},
			},
			default: '',
			description: 'Description of the board content and purpose (optional)',
			placeholder: 'Describe what this board is about...',
		},
		{
			displayName: 'Privacy',
			name: 'privacy',
			type: 'options',
			displayOptions: {
				show: {
					resource: ['board'],
					operation: ['create', 'update'],
				},
			},
			options: [
				{
					name: 'Public',
					value: 'public',
					description: 'Anyone can see this board',
				},
				{
					name: 'Protected',
					value: 'protected',
					description: 'Only you and collaborators can see this board',
				},
				{
					name: 'Secret',
					value: 'secret',
					description: 'Only you can see this board',
				},
			],
			default: 'public',
			description: 'Privacy setting for the board',
		},

		// Board Get/Update/Delete Fields
		{
			displayName: 'Board ID',
			name: 'boardId',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['board'],
					operation: ['get', 'update', 'delete'],
				},
			},
			default: '',
			description: 'The unique identifier of the board',
			placeholder: 'e.g., 123456789012345678',
			hint: 'Board IDs are typically 18-digit numbers. You can find them in Pinterest URLs or from previous operations.',
			validateType: 'string',
			typeOptions: {
				minLength: 1,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]{10,20}$',
							errorMessage: 'Board ID must be a numeric string (typically 18 digits)',
						},
					},
				],
			},
		},

		// Search Configuration Notice
		{
			displayName: 'Search Configuration',
			name: 'searchConfigNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: ['search'],
					operation: ['pins', 'boards', 'trending'],
				},
			},
			default:
				'Search Pinterest content using keywords. Results are paginated and respect rate limits. Use specific terms for better results.',
			typeOptions: {
				theme: 'info',
			},
		},

		// Search Fields
		{
			displayName: 'Search Query',
			name: 'query',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['search'],
					operation: ['pins', 'boards'],
				},
			},
			default: '',
			description: 'Keywords to search for (2-100 characters)',
			placeholder: 'Enter search terms...',
			hint: 'Use specific keywords for better results. You can include hashtags and mentions.',
			validateType: 'string',
			typeOptions: {
				minLength: 2,
				maxLength: 100,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^.{2,100}$',
							errorMessage: 'Search query must be between 2 and 100 characters',
						},
					},
				],
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: {
				show: {
					resource: ['search'],
					operation: ['pins', 'boards', 'trending'],
				},
			},
			typeOptions: {
				minValue: 1,
			},
			default: 50,
			description: 'Max number of results to return',
		},

		// Analytics Configuration Notice
		{
			displayName: 'Analytics Configuration',
			name: 'analyticsConfigNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: ['user'],
					operation: ['getAnalytics', 'getPinAnalytics', 'getBoardAnalytics'],
				},
			},
			default:
				'Analytics data requires a Pinterest Business account and may have a 24-48 hour delay. Date ranges are optional - omit for default periods.',
			typeOptions: {
				theme: 'warning',
			},
		},

		// Analytics Fields
		{
			displayName: 'Start Date',
			name: 'startDate',
			type: 'dateTime',
			displayOptions: {
				show: {
					resource: ['user'],
					operation: ['getAnalytics', 'getPinAnalytics', 'getBoardAnalytics'],
				},
			},
			default: '',
			description: 'Start date for analytics data (optional)',
		},
		{
			displayName: 'End Date',
			name: 'endDate',
			type: 'dateTime',
			displayOptions: {
				show: {
					resource: ['user'],
					operation: ['getAnalytics', 'getPinAnalytics', 'getBoardAnalytics'],
				},
			},
			default: '',
			description: 'End date for analytics data (optional)',
		},
		{
			displayName: 'Pin ID',
			name: 'pinId',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['user'],
					operation: ['getPinAnalytics'],
				},
			},
			default: '',
			description: 'ID of the pin to get analytics for',
			placeholder: 'e.g., 123456789012345678',
			hint: 'Pin analytics are only available for pins you own and may have a 24-48 hour delay',
			validateType: 'string',
			typeOptions: {
				minLength: 1,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]{10,20}$',
							errorMessage: 'Pin ID must be a numeric string (typically 18 digits)',
						},
					},
				],
			},
		},
		{
			displayName: 'Board ID',
			name: 'boardId',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['user'],
					operation: ['getBoardAnalytics'],
				},
			},
			default: '',
			description: 'ID of the board to get analytics for',
			placeholder: 'e.g., 123456789012345678',
			hint: 'Board analytics are only available for boards you own and may have a 24-48 hour delay',
			validateType: 'string',
			typeOptions: {
				minLength: 1,
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]{10,20}$',
							errorMessage: 'Board ID must be a numeric string (typically 18 digits)',
						},
					},
				],
			},
		},

		// Media Upload Configuration Notice
		{
			displayName: 'Media Upload Requirements',
			name: 'mediaUploadNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: ['media'],
					operation: ['upload'],
				},
			},
			default:
				'Upload images (JPEG, PNG, GIF, max 10MB) or videos (MP4, MOV, max 100MB). Uploaded media can be used in pin creation operations.',
			typeOptions: {
				theme: 'info',
			},
		},

		// Media Upload Fields
		{
			displayName: 'Binary Property Name',
			name: 'binaryPropertyName',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					resource: ['media'],
					operation: ['upload'],
				},
			},
			default: 'data',
			description: 'Name of the binary property containing the media file',
			placeholder: 'data',
		},
		{
			displayName: 'Media Type',
			name: 'mediaType',
			type: 'options',
			displayOptions: {
				show: {
					resource: ['media'],
					operation: ['upload'],
				},
			},
			options: [
				{
					name: 'Image',
					value: 'image',
					description: 'Image file (JPEG, PNG, GIF, max 10MB)',
				},
				{
					name: 'Video',
					value: 'video',
					description: 'Video file (MP4, MOV, max 100MB)',
				},
			],
			default: 'image',
			description: 'Type of media file being uploaded',
		},

		// Bulk Operations Configuration Notice
		{
			displayName: 'Bulk Operations',
			name: 'bulkOperationsNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['bulk'],
				},
			},
			default:
				'Bulk operations process multiple items efficiently while respecting rate limits. Input data should be provided as an array from previous nodes.',
			typeOptions: {
				theme: 'warning',
			},
		},

		// Bulk Operations Fields
		{
			displayName: 'Bulk Operation Type',
			name: 'bulkOperationType',
			type: 'options',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['bulk'],
				},
			},
			options: [
				{
					name: 'Get Multiple',
					value: 'getMultiple',
					description: 'Retrieve multiple items by their IDs',
				},
				{
					name: 'Update Multiple',
					value: 'updateMultiple',
					description: 'Update multiple items with new data',
				},
				{
					name: 'Delete Multiple',
					value: 'deleteMultiple',
					description: 'Delete multiple items using an array of IDs',
				},
			],
			default: 'getMultiple',
			hint: 'Bulk operations are more efficient for processing large numbers of items',
		},

		// Enhanced Batch Configuration
		{
			displayName: 'Batch Configuration',
			name: 'batchConfigNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['bulk'],
				},
			},
			default:
				'Configure batch processing settings for optimal performance and rate limit compliance.',
			typeOptions: {
				theme: 'info',
			},
		},

		{
			displayName: 'Max Batch Size',
			name: 'maxBatchSize',
			type: 'number',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['bulk'],
				},
			},
			default: 50,
			typeOptions: {
				minValue: 1,
				maxValue: 100,
			},
			description: 'Maximum number of items to process in each batch',
			hint: 'Smaller batches are more reliable but slower. Larger batches are faster but may hit rate limits.',
		},

		{
			displayName: 'Max Concurrency',
			name: 'maxConcurrency',
			type: 'number',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['bulk'],
				},
			},
			default: 5,
			typeOptions: {
				minValue: 1,
				maxValue: 10,
			},
			description: 'Maximum number of concurrent API requests',
			hint: 'Higher concurrency is faster but may trigger rate limits. Lower values are more stable.',
		},

		{
			displayName: 'Enable Progress Tracking',
			name: 'enableProgressTracking',
			type: 'boolean',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['bulk'],
				},
			},
			default: true,
			description: 'Whether to track and report progress during batch operations',
			hint: 'Progress tracking provides visibility into long-running operations but adds slight overhead.',
		},

		{
			displayName: 'Enable Optimization',
			name: 'enableOptimization',
			type: 'boolean',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['bulk'],
				},
			},
			default: true,
			description: 'Whether to enable intelligent optimizations like duplicate removal and caching',
			hint: 'Optimizations can significantly improve performance for large batches with duplicates.',
		},

		{
			displayName: 'Retry Attempts',
			name: 'retryAttempts',
			type: 'number',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['bulk'],
				},
			},
			default: 3,
			typeOptions: {
				minValue: 0,
				maxValue: 5,
			},
			description: 'Number of retry attempts for failed requests',
			hint: 'More retries increase reliability but may slow down operations.',
		},

		{
			displayName: 'Retry Delay (Ms)',
			name: 'retryDelay',
			type: 'number',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['bulk'],
				},
			},
			default: 1000,
			typeOptions: {
				minValue: 100,
				maxValue: 10000,
			},
			description: 'Delay between retry attempts in milliseconds',
			hint: 'Longer delays reduce server load but increase total processing time.',
		},

		// Bulk Operation Data Fields
		{
			displayName: 'Pin IDs',
			name: 'pinIds',
			type: 'string',
			displayOptions: {
				show: {
					resource: ['pin'],
					operation: ['bulk'],
				},
			},
			default: '',
			placeholder: 'pin1,pin2,pin3 or use array from previous node',
			description: 'Comma-separated list of pin IDs or array from previous node',
			hint: 'You can provide pin IDs as a comma-separated string or connect an array from a previous node.',
			validateType: 'string',
			typeOptions: {
				rows: 3,
			},
		},

		{
			displayName: 'Board IDs',
			name: 'boardIds',
			type: 'string',
			displayOptions: {
				show: {
					resource: ['board'],
					operation: ['bulk'],
				},
			},
			default: '',
			placeholder: 'board1,board2,board3 or use array from previous node',
			description: 'Comma-separated list of board IDs or array from previous node',
			hint: 'You can provide board IDs as a comma-separated string or connect an array from a previous node.',
			validateType: 'string',
			typeOptions: {
				rows: 3,
			},
		},

		{
			displayName: 'Confirm Delete',
			name: 'confirmDelete',
			type: 'boolean',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['bulk'],
					bulkOperationType: ['deleteMultiple'],
				},
			},
			default: false,
			description: 'Whether to confirm that you want to permanently delete the selected items',
			hint: 'This action cannot be undone. Please ensure you have selected the correct items.',
		},

		// Advanced Options Section
		{
			displayName: 'Advanced Options',
			name: 'advancedOptionsNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: ['pin', 'board', 'search'],
					operation: ['create', 'update', 'get', 'pins', 'boards'],
				},
			},
			default: 'Additional options for fine-tuning your Pinterest operations.',
			typeOptions: {
				theme: 'info',
			},
		},

		// Return All Fields Option
		{
			displayName: 'Return All Fields',
			name: 'returnAllFields',
			type: 'boolean',
			displayOptions: {
				show: {
					resource: ['pin', 'board'],
					operation: ['get'],
				},
			},
			default: false,
			description: 'Whether to return all available fields from Pinterest API',
			hint: 'When enabled, returns complete object data including optional fields that may be null',
		},

		// Simplify Output Option
		{
			displayName: 'Simplify Output',
			name: 'simplifyOutput',
			type: 'boolean',
			displayOptions: {
				show: {
					resource: ['pin', 'board', 'user', 'search'],
				},
			},
			default: true,
			description: 'Whether to simplify the output by removing empty fields and nested objects',
			hint: 'Recommended for easier data processing in subsequent nodes',
		},
	],
};
