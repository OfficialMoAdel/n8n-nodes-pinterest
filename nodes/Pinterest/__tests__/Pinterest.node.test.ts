import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { Pinterest } from '../Pinterest.node';

// Mock n8n workflow functions
const mockExecuteFunctions = {
	getInputData: jest.fn(),
	getNodeParameter: jest.fn(),
	continueOnFail: jest.fn(),
	getNode: jest.fn(),
} as unknown as IExecuteFunctions;

describe('Pinterest Node', () => {
	let pinterestNode: Pinterest;

	beforeEach(() => {
		pinterestNode = new Pinterest();
		jest.clearAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			const { description } = pinterestNode;

			expect(description.displayName).toBe('Pinterest');
			expect(description.name).toBe('pinterest');
			expect(description.icon).toBe('file:pinterest.svg');
			expect(description.group).toEqual(['transform']);
			expect(description.version).toBe(1);
		});

		it('should have correct subtitle template', () => {
			const { description } = pinterestNode;
			expect(description.subtitle).toBe(
				'={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			);
		});

		it('should have proper description', () => {
			const { description } = pinterestNode;
			expect(description.description).toBe(
				'Interact with Pinterest API v5 to manage pins, boards, and user data',
			);
		});

		it('should require Pinterest OAuth2 credentials', () => {
			const { description } = pinterestNode;
			expect(description.credentials).toEqual([
				{
					name: 'pinterestOAuth2Api',
					required: true,
				},
			]);
		});

		it('should have correct API defaults', () => {
			const { description } = pinterestNode;
			expect(description.requestDefaults).toEqual({
				baseURL: 'https://api.pinterest.com/v5',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
			});
		});
	});

	describe('Resource and Operation Configuration', () => {
		it('should have all required resources', () => {
			const { description } = pinterestNode;
			const resourceProperty = description.properties.find((p) => p.name === 'resource');

			expect(resourceProperty).toBeDefined();
			expect(resourceProperty?.options).toEqual([
				{
					name: 'Pin',
					value: 'pin',
					description: 'Manage Pinterest pins - create, update, delete, and retrieve pin data',
				},
				{
					name: 'Board',
					value: 'board',
					description: 'Manage Pinterest boards - create, update, delete, and organize boards',
				},
				{
					name: 'User',
					value: 'user',
					description: 'Access user profile information and analytics data',
				},
				{
					name: 'Search',
					value: 'search',
					description: 'Search Pinterest content - pins, boards, and trending topics',
				},
				{
					name: 'Media',
					value: 'media',
					description: 'Upload and manage media files for pins',
				},
			]);
		});

		it('should have pin operations configured correctly', () => {
			const { description } = pinterestNode;
			const pinOperationProperty = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('pin'),
			);

			expect(pinOperationProperty).toBeDefined();
			expect(pinOperationProperty?.options).toEqual([
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new pin with image or video content',
					action: 'Create a pin',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Retrieve pin details and metadata by ID',
					action: 'Get a pin',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update pin title, description, board, or other properties',
					action: 'Update a pin',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Permanently delete a pin from Pinterest',
					action: 'Delete a pin',
				},
				{
					name: 'Bulk Operations',
					value: 'bulk',
					description: 'Perform bulk operations on multiple pins',
					action: 'Bulk pin operations',
				},
			]);
		});

		it('should have board operations configured correctly', () => {
			const { description } = pinterestNode;
			const boardOperationProperty = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('board'),
			);

			expect(boardOperationProperty).toBeDefined();
			expect(boardOperationProperty?.options).toEqual([
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new board with privacy settings and description',
					action: 'Create a board',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Retrieve board details, metadata, and statistics',
					action: 'Get a board',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update board name, description, privacy, or other settings',
					action: 'Update a board',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Permanently delete a board and all its pins',
					action: 'Delete a board',
				},
			]);
		});

		it('should have user operations configured correctly', () => {
			const { description } = pinterestNode;
			const userOperationProperty = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('user'),
			);

			expect(userOperationProperty).toBeDefined();
			expect(userOperationProperty?.options).toEqual([
				{
					name: 'Get Profile',
					value: 'getProfile',
					description: 'Retrieve authenticated user account information and settings',
					action: 'Get user profile',
				},
				{
					name: 'Get Analytics',
					value: 'getAnalytics',
					description: 'Access user-level analytics and performance metrics',
					action: 'Get user analytics',
				},
				{
					name: 'Get Pin Analytics',
					value: 'getPinAnalytics',
					description: 'Retrieve analytics data for specific pins',
					action: 'Get pin analytics',
				},
				{
					name: 'Get Board Analytics',
					value: 'getBoardAnalytics',
					description: 'Access analytics data for specific boards',
					action: 'Get board analytics',
				},
			]);
		});

		it('should have search operations configured correctly', () => {
			const { description } = pinterestNode;
			const searchOperationProperty = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('search'),
			);

			expect(searchOperationProperty).toBeDefined();
			expect(searchOperationProperty?.options).toEqual([
				{
					name: 'Search Pins',
					value: 'pins',
					description: 'Search Pinterest pins by keywords, filters, and criteria',
					action: 'Search pins',
				},
				{
					name: 'Search Boards',
					value: 'boards',
					description: 'Search Pinterest boards by name, description, and metadata',
					action: 'Search boards',
				},
				{
					name: 'Get Trending',
					value: 'trending',
					description: 'Access trending pins, topics, and popular content',
					action: 'Get trending content',
				},
			]);
		});
	});

	describe('Dynamic Field Display', () => {
		it('should show pin operations only when pin resource is selected', () => {
			const { description } = pinterestNode;
			const pinOperationProperty = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('pin'),
			);

			expect(pinOperationProperty?.displayOptions?.show?.resource).toEqual(['pin']);
		});

		it('should show board operations only when board resource is selected', () => {
			const { description } = pinterestNode;
			const boardOperationProperty = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('board'),
			);

			expect(boardOperationProperty?.displayOptions?.show?.resource).toEqual(['board']);
		});

		it('should show user operations only when user resource is selected', () => {
			const { description } = pinterestNode;
			const userOperationProperty = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('user'),
			);

			expect(userOperationProperty?.displayOptions?.show?.resource).toEqual(['user']);
		});

		it('should show search operations only when search resource is selected', () => {
			const { description } = pinterestNode;
			const searchOperationProperty = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('search'),
			);

			expect(searchOperationProperty?.displayOptions?.show?.resource).toEqual(['search']);
		});

		it('should have comprehensive field definitions for all operations', () => {
			const { description } = pinterestNode;

			// Check that we have fields for pin create operation
			const boardIdField = description.properties.find(
				(p) => p.name === 'boardId' && p.displayOptions?.show?.resource?.includes('pin'),
			);
			expect(boardIdField).toBeDefined();

			// Check that we have fields for search operations
			const queryField = description.properties.find(
				(p) => p.name === 'query' && p.displayOptions?.show?.resource?.includes('search'),
			);
			expect(queryField).toBeDefined();

			// Check that we have analytics fields for user operations
			const startDateField = description.properties.find(
				(p) => p.name === 'startDate' && p.displayOptions?.show?.resource?.includes('user'),
			);
			expect(startDateField).toBeDefined();
		});
	});

	describe('Execute Method', () => {
		beforeEach(() => {
			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([
				{ json: { test: 'data' } },
			]);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			(mockExecuteFunctions.getNode as jest.Mock).mockReturnValue({ name: 'Pinterest' });
		});

		it('should execute successfully with valid pin get operation', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('pin') // resource
				.mockReturnValueOnce('get') // operation
				.mockReturnValueOnce('123456789'); // pinId

			// Mock the API client and operation
			const mockApiClient = {
				getPin: jest.fn().mockResolvedValue({
					id: '123456789',
					title: 'Test Pin',
					description: 'Test Description',
				}),
			};

			jest
				.spyOn(require('../utils/PinterestApiClient'), 'PinterestApiClient')
				.mockImplementation(() => mockApiClient);

			const result = await pinterestNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('pinId', '123456789');
		});

		it('should validate board operations correctly', () => {
			const mockNode = { name: 'Pinterest', type: 'pinterest' };

			// Valid board operations should not throw
			expect(() => {
				(Pinterest as any).validateResourceOperation('board', 'create', mockNode);
			}).not.toThrow();

			expect(() => {
				(Pinterest as any).validateResourceOperation('board', 'get', mockNode);
			}).not.toThrow();
		});

		it('should validate user operations correctly', () => {
			const mockNode = { name: 'Pinterest', type: 'pinterest' };

			// Valid user operations should not throw
			expect(() => {
				(Pinterest as any).validateResourceOperation('user', 'getProfile', mockNode);
			}).not.toThrow();

			expect(() => {
				(Pinterest as any).validateResourceOperation('user', 'getAnalytics', mockNode);
			}).not.toThrow();
		});

		it('should validate search operations correctly', () => {
			const mockNode = { name: 'Pinterest', type: 'pinterest' };

			// Valid search operations should not throw
			expect(() => {
				(Pinterest as any).validateResourceOperation('search', 'pins', mockNode);
			}).not.toThrow();

			expect(() => {
				(Pinterest as any).validateResourceOperation('search', 'boards', mockNode);
			}).not.toThrow();
		});

		it('should throw error for invalid resource', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('invalid') // resource
				.mockReturnValueOnce('create'); // operation

			await expect(pinterestNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for invalid operation for pin resource', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('pin') // resource
				.mockReturnValueOnce('invalid'); // operation

			await expect(pinterestNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for invalid operation for user resource', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('user') // resource
				.mockReturnValueOnce('create'); // operation (not valid for user)

			await expect(pinterestNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should validate multiple resource and operation combinations', () => {
			const mockNode = { name: 'Pinterest', type: 'pinterest' };

			// Test multiple valid combinations
			const validCombinations = [
				['pin', 'create'],
				['pin', 'get'],
				['board', 'create'],
				['user', 'getProfile'],
				['search', 'pins'],
				['media', 'upload'],
			];

			validCombinations.forEach(([resource, operation]) => {
				expect(() => {
					(Pinterest as any).validateResourceOperation(resource, operation, mockNode);
				}).not.toThrow();
			});
		});

		it('should continue on fail when configured', async () => {
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('invalid') // resource (first call)
				.mockReturnValueOnce('create') // operation (first call)
				.mockReturnValueOnce('invalid') // resource (error handler call)
				.mockReturnValueOnce('create'); // operation (error handler call)

			const result = await pinterestNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toMatchObject({
				resource: 'invalid',
				operation: 'create',
			});
			expect(result[0][0].json.error).toContain('Invalid resource');
		});
	});

	describe('Resource Operation Validation', () => {
		it('should validate pin operations correctly', () => {
			const validOperations = ['create', 'get', 'update', 'delete'];
			const mockNode = { name: 'Pinterest' };

			validOperations.forEach((operation) => {
				expect(() => {
					(Pinterest as any).validateResourceOperation('pin', operation, mockNode);
				}).not.toThrow();
			});
		});

		it('should validate board operations correctly', () => {
			const validOperations = ['create', 'get', 'update', 'delete'];
			const mockNode = { name: 'Pinterest' };

			validOperations.forEach((operation) => {
				expect(() => {
					(Pinterest as any).validateResourceOperation('board', operation, mockNode);
				}).not.toThrow();
			});
		});

		it('should validate user operations correctly', () => {
			const validOperations = ['getProfile', 'getAnalytics'];
			const mockNode = { name: 'Pinterest' };

			validOperations.forEach((operation) => {
				expect(() => {
					(Pinterest as any).validateResourceOperation('user', operation, mockNode);
				}).not.toThrow();
			});
		});

		it('should validate search operations correctly', () => {
			const validOperations = ['pins', 'boards'];
			const mockNode = { name: 'Pinterest' };

			validOperations.forEach((operation) => {
				expect(() => {
					(Pinterest as any).validateResourceOperation('search', operation, mockNode);
				}).not.toThrow();
			});
		});

		it('should reject invalid resource', () => {
			const mockNode = { name: 'Pinterest' };
			expect(() => {
				(Pinterest as any).validateResourceOperation('invalid', 'create', mockNode);
			}).toThrow('Invalid resource: invalid');
		});

		it('should reject invalid operation for valid resource', () => {
			const mockNode = { name: 'Pinterest' };
			expect(() => {
				(Pinterest as any).validateResourceOperation('pin', 'invalid', mockNode);
			}).toThrow("Invalid operation 'invalid' for resource 'pin'");
		});
	});

	describe('Error Context Enhancement', () => {
		it('should enhance errors with operation context', () => {
			const error = new Error('Test error');

			(Pinterest as any).enhanceErrorContext(error, 'pin', 'create', 0);

			expect((error as any).resource).toBe('pin');
			expect((error as any).operation).toBe('create');
			expect((error as any).itemIndex).toBe(0);
		});

		it('should not overwrite existing error context', () => {
			const error = new Error('Test error') as any;
			error.resource = 'existing';
			error.operation = 'existing';
			error.itemIndex = 999;

			(Pinterest as any).enhanceErrorContext(error, 'pin', 'create', 0);

			expect(error.resource).toBe('existing');
			expect(error.operation).toBe('existing');
			expect(error.itemIndex).toBe(999);
		});

		it('should handle null or undefined errors gracefully', () => {
			expect(() => {
				(Pinterest as any).enhanceErrorContext(null, 'pin', 'create', 0);
			}).not.toThrow();

			expect(() => {
				(Pinterest as any).enhanceErrorContext(undefined, 'pin', 'create', 0);
			}).not.toThrow();
		});
	});
});
