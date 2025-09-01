# Pinterest Node Developer Guide

This guide provides comprehensive information for developers who want to extend, modify, or contribute to the Pinterest node for n8n.

## Architecture Overview

The Pinterest node follows n8n's community node architecture with a modular design that separates concerns for maintainability and testability.

### Project Structure

```
n8n-nodes-pinterest/
├── credentials/
│   └── PinterestOAuth2Api.credentials.ts    # OAuth 2.0 credential configuration
├── nodes/
│   └── Pinterest/
│       ├── Pinterest.node.ts                # Main node implementation
│       ├── PinterestDescription.ts          # Node UI configuration
│       ├── operations/                      # Operation handlers
│       │   ├── pin/                        # Pin-related operations
│       │   ├── board/                      # Board-related operations
│       │   ├── user/                       # User-related operations
│       │   └── search/                     # Search operations
│       ├── utils/                          # Utility classes
│       │   ├── PinterestApiClient.ts       # API client wrapper
│       │   ├── RateLimiter.ts             # Rate limiting logic
│       │   ├── DataTransformer.ts         # Data transformation
│       │   ├── ErrorHandler.ts            # Error handling
│       │   └── types.ts                   # TypeScript type definitions
│       └── pinterest.svg                   # Node icon
├── __tests__/                              # Test files
├── package.json                            # Package configuration
├── tsconfig.json                           # TypeScript configuration
└── README.md                               # Main documentation
```

## Core Components

### 1. Main Node Class (Pinterest.node.ts)

The main node class implements the `INodeType` interface and serves as the entry point for all Pinterest operations.

```typescript
export class Pinterest implements INodeType {
	description: INodeTypeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// Initialize API client
		const credentials = await this.getCredentials('pinterestOAuth2Api');
		const apiClient = new PinterestApiClient(credentials, this.helpers);

		// Route to appropriate operation handler
		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: INodeExecutionData;

				switch (resource) {
					case 'pin':
						responseData = await this.handlePinOperation(operation, apiClient, i);
						break;
					case 'board':
						responseData = await this.handleBoardOperation(operation, apiClient, i);
						break;
					// ... other resources
				}

				returnData.push(responseData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {} });
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}
```

### 2. API Client (PinterestApiClient.ts)

The API client provides a centralized interface for all Pinterest API interactions with built-in rate limiting and error handling.

```typescript
export class PinterestApiClient {
	private rateLimiter: RateLimiter;
	private errorHandler: ErrorHandler;
	private baseUrl = 'https://api.pinterest.com/v5';

	constructor(
		private credentials: ICredentialDataDecryptedObject,
		private helpers: IHttpRequestHelper,
	) {
		this.rateLimiter = new RateLimiter();
		this.errorHandler = new ErrorHandler();
	}

	async makeRequest<T>(
		method: string,
		endpoint: string,
		data?: any,
		options?: IRequestOptions,
	): Promise<T> {
		// Check rate limits before making request
		await this.rateLimiter.checkLimit();

		try {
			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'pinterestOAuth2Api',
				{
					method,
					url: `${this.baseUrl}${endpoint}`,
					body: data,
					json: true,
					...options,
				},
			);

			// Update rate limiter with response headers
			this.rateLimiter.updateFromHeaders(response.headers);

			return response;
		} catch (error) {
			throw this.errorHandler.handleApiError(error);
		}
	}
}
```

### 3. Operation Handlers

Each Pinterest resource has dedicated operation handlers that implement specific business logic.

```typescript
// Example: Pin Create Operation
export async function createPin(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	// Extract parameters
	const boardId = this.getNodeParameter('boardId', itemIndex) as string;
	const mediaSource = this.getNodeParameter('mediaSource', itemIndex) as string;

	// Validate required parameters
	if (!boardId) {
		throw new NodeOperationError(this.getNode(), 'Board ID is required');
	}

	// Handle media upload if needed
	let mediaData: any = {};
	if (mediaSource === 'upload') {
		const mediaFile = this.getNodeParameter('mediaFile', itemIndex) as IDataObject;
		const uploadResponse = await apiClient.uploadMedia(mediaFile);
		mediaData.media_id = uploadResponse.media_id;
	} else {
		mediaData.url = this.getNodeParameter('mediaUrl', itemIndex) as string;
	}

	// Prepare request data
	const pinData = {
		board_id: boardId,
		media_source: {
			source_type: mediaSource === 'upload' ? 'image_upload' : 'image_url',
			...mediaData,
		},
		title: this.getNodeParameter('title', itemIndex, '') as string,
		description: this.getNodeParameter('description', itemIndex, '') as string,
		// ... other fields
	};

	// Make API request
	const response = await apiClient.createPin(pinData);

	// Transform response data
	return {
		json: DataTransformer.transformPinResponse(response),
		pairedItem: { item: itemIndex },
	};
}
```

## Adding New Operations

### Step 1: Define Operation in Description

Add the new operation to the node description in `PinterestDescription.ts`:

```typescript
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
      name: 'Create',
      value: 'create',
      description: 'Create a new pin',
      action: 'Create a pin',
    },
    {
      name: 'Get Analytics', // New operation
      value: 'getAnalytics',
      description: 'Get analytics data for a pin',
      action: 'Get pin analytics',
    },
    // ... existing operations
  ],
  default: 'create',
}
```

### Step 2: Add Operation Parameters

Define the parameters for your new operation:

```typescript
{
  displayName: 'Pin ID',
  name: 'pinId',
  type: 'string',
  required: true,
  displayOptions: {
    show: {
      resource: ['pin'],
      operation: ['getAnalytics'],
    },
  },
  default: '',
  description: 'ID of the pin to get analytics for',
},
{
  displayName: 'Start Date',
  name: 'startDate',
  type: 'dateTime',
  required: true,
  displayOptions: {
    show: {
      resource: ['pin'],
      operation: ['getAnalytics'],
    },
  },
  default: '',
  description: 'Start date for analytics data',
},
```

### Step 3: Implement Operation Handler

Create the operation handler function:

```typescript
// operations/pin/getAnalytics.operation.ts
export async function getPinAnalytics(
	this: IExecuteFunctions,
	apiClient: PinterestApiClient,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const pinId = this.getNodeParameter('pinId', itemIndex) as string;
	const startDate = this.getNodeParameter('startDate', itemIndex) as string;
	const endDate = this.getNodeParameter('endDate', itemIndex) as string;

	// Validate parameters
	if (!pinId) {
		throw new NodeOperationError(this.getNode(), 'Pin ID is required');
	}

	// Prepare query parameters
	const params = {
		start_date: startDate,
		end_date: endDate,
		metric_types: 'IMPRESSION,SAVE,PIN_CLICK',
	};

	// Make API request
	const response = await apiClient.getPinAnalytics(pinId, params);

	// Transform and return data
	return {
		json: DataTransformer.transformAnalyticsResponse(response),
		pairedItem: { item: itemIndex },
	};
}
```

### Step 4: Add API Client Method

Add the corresponding method to the API client:

```typescript
// utils/PinterestApiClient.ts
async getPinAnalytics(
  pinId: string,
  params: AnalyticsParams
): Promise<AnalyticsResponse> {
  const queryString = new URLSearchParams(params).toString();
  return this.makeRequest('GET', `/pins/${pinId}/analytics?${queryString}`);
}
```

### Step 5: Update Operation Router

Add the new operation to the main node's operation router:

```typescript
// Pinterest.node.ts
private async handlePinOperation(
  operation: string,
  apiClient: PinterestApiClient,
  itemIndex: number
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'create':
      return createPin.call(this, apiClient, itemIndex);
    case 'getAnalytics': // New operation
      return getPinAnalytics.call(this, apiClient, itemIndex);
    // ... other operations
    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
}
```

## Adding New Resources

### Step 1: Define Resource

Add the new resource to the node description:

```typescript
{
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  noDataExpression: true,
  options: [
    {
      name: 'Pin',
      value: 'pin',
    },
    {
      name: 'Board',
      value: 'board',
    },
    {
      name: 'Audience', // New resource
      value: 'audience',
    },
  ],
  default: 'pin',
}
```

### Step 2: Create Resource Directory

Create a new directory structure for the resource:

```
operations/
└── audience/
    ├── create.operation.ts
    ├── get.operation.ts
    ├── update.operation.ts
    ├── delete.operation.ts
    └── index.ts
```

### Step 3: Implement Operations

Follow the same pattern as existing resources to implement operations.

### Step 4: Add Resource Handler

Add the resource handler to the main node:

```typescript
// Pinterest.node.ts
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  // ... existing code

  switch (resource) {
    case 'pin':
      responseData = await this.handlePinOperation(operation, apiClient, i);
      break;
    case 'board':
      responseData = await this.handleBoardOperation(operation, apiClient, i);
      break;
    case 'audience': // New resource
      responseData = await this.handleAudienceOperation(operation, apiClient, i);
      break;
    default:
      throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
  }
}
```

## Error Handling Best Practices

### Custom Error Types

Define specific error types for different scenarios:

```typescript
export class PinterestApiError extends NodeApiError {
	constructor(node: INode, error: any, operation?: string) {
		const message = PinterestApiError.formatErrorMessage(error, operation);
		super(node, error, { message });
	}

	private static formatErrorMessage(error: any, operation?: string): string {
		const statusCode = error.response?.status;
		const errorData = error.response?.data;

		switch (statusCode) {
			case 400:
				return `Bad Request in ${operation}: ${errorData?.message || 'Invalid parameters'}`;
			case 401:
				return 'Authentication failed: Please check your Pinterest credentials';
			case 403:
				return 'Forbidden: Insufficient permissions for this operation';
			case 404:
				return `Not Found: The requested ${operation} resource was not found`;
			case 429:
				return 'Rate limit exceeded: Please wait before making more requests';
			default:
				return `Pinterest API Error (${statusCode}): ${errorData?.message || 'Unknown error'}`;
		}
	}
}
```

### Error Recovery

Implement retry logic for transient errors:

```typescript
export class RetryHandler {
	static async withRetry<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		baseDelay: number = 1000,
	): Promise<T> {
		let lastError: Error;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error;

				// Don't retry on client errors (4xx)
				if (error.response?.status >= 400 && error.response?.status < 500) {
					throw error;
				}

				// Don't retry on last attempt
				if (attempt === maxRetries) {
					break;
				}

				// Exponential backoff
				const delay = baseDelay * Math.pow(2, attempt);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw lastError;
	}
}
```

## Testing

### Unit Tests

Create comprehensive unit tests for each component:

```typescript
// __tests__/operations/pin/create.test.ts
describe('Pin Create Operation', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	let mockApiClient: PinterestApiClient;

	beforeEach(() => {
		mockExecuteFunctions = createMockExecuteFunctions();
		mockApiClient = createMockApiClient();
	});

	it('should create pin with valid data', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('board123') // boardId
			.mockReturnValueOnce('url') // mediaSource
			.mockReturnValueOnce('https://example.com/image.jpg'); // mediaUrl

		mockApiClient.createPin.mockResolvedValue({
			id: 'pin123',
			url: 'https://pinterest.com/pin/pin123/',
			// ... other response data
		});

		// Act
		const result = await createPin.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(result.json).toEqual({
			pinId: 'pin123',
			url: 'https://pinterest.com/pin/pin123/',
			// ... expected transformed data
		});
		expect(mockApiClient.createPin).toHaveBeenCalledWith({
			board_id: 'board123',
			media_source: {
				source_type: 'image_url',
				url: 'https://example.com/image.jpg',
			},
		});
	});

	it('should throw error for missing board ID', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter.mockReturnValue('');

		// Act & Assert
		await expect(createPin.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'Board ID is required',
		);
	});
});
```

### Integration Tests

Test the complete flow with real API calls (using test credentials):

```typescript
// __tests__/integration/pinterest.integration.test.ts
describe('Pinterest Node Integration', () => {
	let credentials: ICredentialDataDecryptedObject;
	let apiClient: PinterestApiClient;

	beforeAll(async () => {
		credentials = await loadTestCredentials();
		apiClient = new PinterestApiClient(credentials, mockHelpers);
	});

	it('should create and delete pin', async () => {
		// Create pin
		const createResponse = await apiClient.createPin({
			board_id: TEST_BOARD_ID,
			media_source: {
				source_type: 'image_url',
				url: 'https://example.com/test-image.jpg',
			},
			title: 'Test Pin',
		});

		expect(createResponse.id).toBeDefined();

		// Clean up - delete pin
		await apiClient.deletePin(createResponse.id);
	});
});
```

## Performance Optimization

### Caching

Implement caching for frequently accessed data:

```typescript
export class CacheManager {
	private cache = new Map<string, { data: any; expiry: number }>();
	private defaultTtl = 5 * 60 * 1000; // 5 minutes

	get<T>(key: string): T | null {
		const item = this.cache.get(key);
		if (!item || Date.now() > item.expiry) {
			this.cache.delete(key);
			return null;
		}
		return item.data;
	}

	set<T>(key: string, data: T, ttl: number = this.defaultTtl): void {
		this.cache.set(key, {
			data,
			expiry: Date.now() + ttl,
		});
	}
}
```

### Batch Operations

Implement batch processing for multiple items:

```typescript
export class BatchProcessor {
	static async processBatch<T, R>(
		items: T[],
		processor: (item: T) => Promise<R>,
		batchSize: number = 10,
		delayMs: number = 100,
	): Promise<R[]> {
		const results: R[] = [];

		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			const batchPromises = batch.map(processor);
			const batchResults = await Promise.all(batchPromises);

			results.push(...batchResults);

			// Add delay between batches to respect rate limits
			if (i + batchSize < items.length) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}

		return results;
	}
}
```

## Security Considerations

### Credential Handling

Never log or expose sensitive credential information:

```typescript
export class SecurityUtils {
	static sanitizeForLogging(data: any): any {
		const sensitiveFields = ['access_token', 'refresh_token', 'client_secret'];

		if (typeof data === 'object' && data !== null) {
			const sanitized = { ...data };

			for (const field of sensitiveFields) {
				if (sanitized[field]) {
					sanitized[field] = '[REDACTED]';
				}
			}

			return sanitized;
		}

		return data;
	}
}
```

### Input Validation

Validate all user inputs to prevent injection attacks:

```typescript
export class InputValidator {
	static validatePinId(pinId: string): boolean {
		// Pinterest pin IDs are numeric strings
		return /^\d+$/.test(pinId);
	}

	static validateUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return ['http:', 'https:'].includes(parsed.protocol);
		} catch {
			return false;
		}
	}

	static sanitizeString(input: string, maxLength: number = 1000): string {
		return input.trim().substring(0, maxLength).replace(/[<>]/g, ''); // Remove potential HTML tags
	}
}
```

## Contributing Guidelines

### Code Style

Follow the established code style:

```typescript
// Use TypeScript strict mode
// Prefer explicit types over 'any'
// Use meaningful variable and function names
// Add JSDoc comments for public methods

/**
 * Creates a new pin on Pinterest
 * @param pinData - The pin data to create
 * @returns Promise resolving to the created pin data
 */
async createPin(pinData: CreatePinRequest): Promise<PinResponse> {
  // Implementation
}
```

### Commit Messages

Use conventional commit format:

```
feat: add pin analytics operation
fix: handle rate limit errors correctly
docs: update API client documentation
test: add unit tests for board operations
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request with detailed description

### Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release tag
4. Publish to npm registry

This developer guide provides the foundation for extending and maintaining the Pinterest node. For specific implementation details, refer to the existing code and follow the established patterns.
