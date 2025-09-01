import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Pinterest } from '../Pinterest.node';
import { PinterestApiClient } from '../utils/PinterestApiClient';

// Mock all operation handlers
jest.mock('../operations/pin', () => ({
	createPin: jest.fn(),
	getPin: jest.fn(),
	updatePin: jest.fn(),
	deletePin: jest.fn(),
	bulkGetPins: jest.fn(),
	bulkUpdatePins: jest.fn(),
	bulkDeletePins: jest.fn(),
}));

jest.mock('../operations/board', () => ({
	createBoard: jest.fn(),
	getBoard: jest.fn(),
	updateBoard: jest.fn(),
	deleteBoard: jest.fn(),
}));

jest.mock('../operations/user', () => ({
	getUserProfile: jest.fn(),
	getUserAnalytics: jest.fn(),
	getPinAnalytics: jest.fn(),
	getBoardAnalytics: jest.fn(),
}));

jest.mock('../operations/search', () => ({
	searchPins: jest.fn(),
	searchBoards: jest.fn(),
	getTrending: jest.fn(),
}));

jest.mock('../operations/media', () => ({
	uploadMedia: jest.fn(),
}));

jest.mock('../utils/PinterestApiClient');

describe('Pinterest Node - Operation Routing', () => {
	let pinterest: Pinterest;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockApiClient: jest.Mocked<PinterestApiClient>;

	beforeEach(() => {
		pinterest = new Pinterest();

		// Mock IExecuteFunctions
		mockExecuteFunctions = {
			getInputData: jest.fn(),
			getNodeParameter: jest.fn(),
			getNode: jest.fn(),
			continueOnFail: jest.fn(),
			helpers: {
				assertBinaryData: jest.fn(),
			},
		} as any;

		// Mock PinterestApiClient
		mockApiClient = new PinterestApiClient(mockExecuteFunctions) as jest.Mocked<PinterestApiClient>;
		(PinterestApiClient as jest.MockedClass<typeof PinterestApiClient>).mockImplementation(
			() => mockApiClient,
		);

		// Default mock implementations
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'pinterest-node-id',
			name: 'Pinterest',
			type: 'pinterest',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Resource and Operation Validation', () => {
		it('should validate valid resource and operation combinations', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pin') // resource
				.mockReturnValueOnce('create'); // operation

			const mockResult: INodeExecutionData = {
				json: { success: true },
				pairedItem: { item: 0 },
			};

			const pinOperations = require('../operations/pin');
			pinOperations.createPin.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(pinOperations.createPin).toHaveBeenCalledWith(mockApiClient, 0);
		});

		it('should throw error for invalid resource', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('invalid') // resource
				.mockReturnValueOnce('create'); // operation

			await expect(pinterest.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for invalid operation for valid resource', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pin') // resource
				.mockReturnValueOnce('invalid'); // operation

			await expect(pinterest.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('Pin Operations Routing', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('pin'); // resource
		});

		it('should route to createPin operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('create'); // operation

			const mockResult: INodeExecutionData = {
				json: { pinId: '123', title: 'Test Pin' },
				pairedItem: { item: 0 },
			};

			const pinOperations = require('../operations/pin');
			pinOperations.createPin.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(pinOperations.createPin).toHaveBeenCalledWith(mockApiClient, 0);
		});

		it('should route to getPin operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('get'); // operation

			const mockResult: INodeExecutionData = {
				json: { pinId: '123', title: 'Retrieved Pin' },
				pairedItem: { item: 0 },
			};

			const pinOperations = require('../operations/pin');
			pinOperations.getPin.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(pinOperations.getPin).toHaveBeenCalledWith(mockApiClient, 0);
		});

		it('should route to updatePin operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('update'); // operation

			const mockResult: INodeExecutionData = {
				json: { pinId: '123', title: 'Updated Pin' },
				pairedItem: { item: 0 },
			};

			const pinOperations = require('../operations/pin');
			pinOperations.updatePin.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(pinOperations.updatePin).toHaveBeenCalledWith(mockApiClient, 0);
		});

		it('should route to deletePin operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('delete'); // operation

			const mockResult: INodeExecutionData = {
				json: { success: true, message: 'Pin deleted' },
				pairedItem: { item: 0 },
			};

			const pinOperations = require('../operations/pin');
			pinOperations.deletePin.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(pinOperations.deletePin).toHaveBeenCalledWith(mockApiClient, 0);
		});

		it('should route to bulk pin operations', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('bulk') // operation
				.mockReturnValueOnce('getMultiple'); // bulkOperationType

			const mockResult: INodeExecutionData[] = [
				{
					json: { pinId: '123', title: 'Pin 1' },
					pairedItem: { item: 0 },
				},
				{
					json: { pinId: '456', title: 'Pin 2' },
					pairedItem: { item: 0 },
				},
			];

			const pinOperations = require('../operations/pin');
			pinOperations.bulkGetPins.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([mockResult]);
			expect(pinOperations.bulkGetPins).toHaveBeenCalledWith(mockApiClient, 0);
		});
	});

	describe('Board Operations Routing', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('board'); // resource
		});

		it('should route to createBoard operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('create'); // operation

			const mockResult: INodeExecutionData = {
				json: { boardId: '456', name: 'Test Board' },
				pairedItem: { item: 0 },
			};

			const boardOperations = require('../operations/board');
			boardOperations.createBoard.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(boardOperations.createBoard).toHaveBeenCalledWith(mockApiClient, 0);
		});

		it('should route to getBoard operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('get'); // operation

			const mockResult: INodeExecutionData = {
				json: { boardId: '456', name: 'Retrieved Board' },
				pairedItem: { item: 0 },
			};

			const boardOperations = require('../operations/board');
			boardOperations.getBoard.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(boardOperations.getBoard).toHaveBeenCalledWith(mockApiClient, 0);
		});
	});

	describe('User Operations Routing', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('user'); // resource
		});

		it('should route to getUserProfile operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getProfile'); // operation

			const mockResult: INodeExecutionData = {
				json: { userId: '789', username: 'testuser' },
				pairedItem: { item: 0 },
			};

			const userOperations = require('../operations/user');
			userOperations.getUserProfile.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(userOperations.getUserProfile).toHaveBeenCalledWith(mockApiClient, 0);
		});

		it('should route to getUserAnalytics operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getAnalytics'); // operation

			const mockResult: INodeExecutionData = {
				json: { impressions: 1000, saves: 50 },
				pairedItem: { item: 0 },
			};

			const userOperations = require('../operations/user');
			userOperations.getUserAnalytics.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(userOperations.getUserAnalytics).toHaveBeenCalledWith(mockApiClient, 0);
		});
	});

	describe('Search Operations Routing', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('search'); // resource
		});

		it('should route to searchPins operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('pins'); // operation

			const mockResult: INodeExecutionData = {
				json: { results: [{ pinId: '123' }, { pinId: '456' }] },
				pairedItem: { item: 0 },
			};

			const searchOperations = require('../operations/search');
			searchOperations.searchPins.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(searchOperations.searchPins).toHaveBeenCalledWith(mockApiClient, 0);
		});

		it('should route to searchBoards operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('boards'); // operation

			const mockResult: INodeExecutionData = {
				json: { results: [{ boardId: '789' }] },
				pairedItem: { item: 0 },
			};

			const searchOperations = require('../operations/search');
			searchOperations.searchBoards.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(searchOperations.searchBoards).toHaveBeenCalledWith(mockApiClient, 0);
		});
	});

	describe('Media Operations Routing', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('media'); // resource
		});

		it('should route to uploadMedia operation', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('upload'); // operation

			const mockResult: INodeExecutionData = {
				json: { mediaId: 'media123', status: 'uploaded' },
				pairedItem: { item: 0 },
			};

			const mediaOperations = require('../operations/media');
			mediaOperations.uploadMedia.mockResolvedValue(mockResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockResult]]);
			expect(mediaOperations.uploadMedia).toHaveBeenCalledWith(0);
		});
	});

	describe('Error Handling and Propagation', () => {
		it('should propagate errors from operation handlers when not continuing on fail', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pin') // resource
				.mockReturnValueOnce('create'); // operation

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			const testError = new NodeOperationError(
				{
					id: 'pinterest-node-id',
					name: 'Pinterest',
					type: 'pinterest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				'Test error from operation handler',
			);

			const pinOperations = require('../operations/pin');
			pinOperations.createPin.mockRejectedValue(testError);

			await expect(pinterest.execute.call(mockExecuteFunctions)).rejects.toThrow(testError);
		});

		it('should handle errors gracefully when continuing on fail', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pin') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('pin') // resource for error handling
				.mockReturnValueOnce('create'); // operation for error handling

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const testError = new Error('Test error from operation handler');

			const pinOperations = require('../operations/pin');
			pinOperations.createPin.mockRejectedValue(testError);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toMatchObject({
				error: 'Test error from operation handler',
				errorType: 'Error',
				resource: 'pin',
				operation: 'create',
				itemIndex: 0,
			});
		});

		it('should enhance errors with operation context', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('board') // resource
				.mockReturnValueOnce('update'); // operation

			const testError = new NodeOperationError(
				{
					id: 'pinterest-node-id',
					name: 'Pinterest',
					type: 'pinterest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				'Board not found',
			);

			const boardOperations = require('../operations/board');
			boardOperations.updateBoard.mockRejectedValue(testError);

			await expect(pinterest.execute.call(mockExecuteFunctions)).rejects.toThrow(testError);

			// Verify error context was enhanced (these properties are added dynamically)
			expect((testError as any).resource).toBe('board');
			expect((testError as any).operation).toBe('update');
			expect((testError as any).itemIndex).toBe(0);
		});
	});

	describe('Multiple Items Processing', () => {
		it('should process multiple input items correctly', async () => {
			const inputItems = [{ json: { id: 1 } }, { json: { id: 2 } }];
			mockExecuteFunctions.getInputData.mockReturnValue(inputItems);

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pin') // resource for item 0
				.mockReturnValueOnce('create') // operation for item 0
				.mockReturnValueOnce('pin') // resource for item 1
				.mockReturnValueOnce('get'); // operation for item 1

			const mockCreateResult: INodeExecutionData = {
				json: { pinId: '123', created: true },
				pairedItem: { item: 0 },
			};

			const mockGetResult: INodeExecutionData = {
				json: { pinId: '456', retrieved: true },
				pairedItem: { item: 1 },
			};

			const pinOperations = require('../operations/pin');
			pinOperations.createPin.mockResolvedValue(mockCreateResult);
			pinOperations.getPin.mockResolvedValue(mockGetResult);

			const result = await pinterest.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[mockCreateResult, mockGetResult]]);
			expect(pinOperations.createPin).toHaveBeenCalledWith(mockApiClient, 0);
			expect(pinOperations.getPin).toHaveBeenCalledWith(mockApiClient, 1);
		});
	});

	describe('Execution Context Passing', () => {
		it('should pass execution context to all operation handlers', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('user') // resource
				.mockReturnValueOnce('getProfile'); // operation

			const mockResult: INodeExecutionData = {
				json: { userId: '789' },
				pairedItem: { item: 0 },
			};

			const userOperations = require('../operations/user');
			userOperations.getUserProfile.mockResolvedValue(mockResult);

			await pinterest.execute.call(mockExecuteFunctions);

			// Verify that the operation handler was called with the correct context
			expect(userOperations.getUserProfile).toHaveBeenCalledWith(mockApiClient, 0);

			// Verify that the operation handler was called with the correct 'this' context
			expect(userOperations.getUserProfile.mock.calls[0].length).toBe(2);
		});
	});
});
