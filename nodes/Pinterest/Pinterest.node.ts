import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { PinterestApiClient } from './utils/PinterestApiClient';
import { PinterestDescription } from './PinterestDescription';

// Import all operation handlers
import * as pinOperations from './operations/pin';
import * as boardOperations from './operations/board';
import * as userOperations from './operations/user';
import * as searchOperations from './operations/search';
import * as mediaOperations from './operations/media';

export class Pinterest implements INodeType {
	description: INodeTypeDescription = PinterestDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Initialize Pinterest API client with execution context
		const apiClient = new PinterestApiClient(this);

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				// Validate resource and operation combination
				Pinterest.validateResourceOperation(resource, operation, this.getNode());

				// Route to appropriate operation handler with execution context
				const result = await Pinterest.routeOperation.call(this, resource, operation, apiClient, i);

				// Handle both single results and arrays of results
				if (Array.isArray(result)) {
					returnData.push(...result);
				} else {
					returnData.push(result);
				}
			} catch (error) {
				// Propagate errors from operation handlers with proper context
				const errorResult = Pinterest.handleExecutionError.call(this, error, i);

				if (errorResult) {
					returnData.push(errorResult);
					continue;
				}

				// Re-throw if not continuing on fail
				throw error;
			}
		}

		return [returnData];
	}

	/**
	 * Validates that the resource and operation combination is valid
	 */
	private static validateResourceOperation(resource: string, operation: string, node: any): void {
		const validCombinations: Record<string, string[]> = {
			pin: ['create', 'get', 'update', 'delete', 'bulk'],
			board: ['create', 'get', 'update', 'delete'],
			user: ['getProfile', 'getAnalytics', 'getPinAnalytics', 'getBoardAnalytics'],
			search: ['pins', 'boards', 'trending'],
			media: ['upload'],
		};

		if (!validCombinations[resource]) {
			throw new NodeOperationError(node, `Invalid resource: ${resource}`);
		}

		if (!validCombinations[resource].includes(operation)) {
			throw new NodeOperationError(
				node,
				`Invalid operation '${operation}' for resource '${resource}'. Valid operations: ${validCombinations[resource].join(', ')}`,
			);
		}
	}

	/**
	 * Routes operation to the appropriate handler with execution context
	 */
	private static async routeOperation(
		this: IExecuteFunctions,
		resource: string,
		operation: string,
		apiClient: PinterestApiClient,
		itemIndex: number,
	): Promise<INodeExecutionData | INodeExecutionData[]> {
		try {
			switch (resource) {
				case 'pin':
					return await Pinterest.routePinOperation.call(this, operation, apiClient, itemIndex);

				case 'board':
					return await Pinterest.routeBoardOperation.call(this, operation, apiClient, itemIndex);

				case 'user':
					return await Pinterest.routeUserOperation.call(this, operation, apiClient, itemIndex);

				case 'search':
					return await Pinterest.routeSearchOperation.call(this, operation, apiClient, itemIndex);

				case 'media':
					return await Pinterest.routeMediaOperation.call(this, operation, apiClient, itemIndex);

				default:
					throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, {
						itemIndex,
					});
			}
		} catch (error) {
			// Enhance error with operation context before propagating
			Pinterest.enhanceErrorContext(error, resource, operation, itemIndex);
			throw error;
		}
	}

	/**
	 * Routes pin operations to specific handlers
	 */
	private static async routePinOperation(
		this: IExecuteFunctions,
		operation: string,
		apiClient: PinterestApiClient,
		itemIndex: number,
	): Promise<INodeExecutionData | INodeExecutionData[]> {
		switch (operation) {
			case 'create':
				return await pinOperations.createPin.call(this, apiClient, itemIndex);
			case 'get':
				return await pinOperations.getPin.call(this, apiClient, itemIndex);
			case 'update':
				return await pinOperations.updatePin.call(this, apiClient, itemIndex);
			case 'delete':
				return await pinOperations.deletePin.call(this, apiClient, itemIndex);
			case 'bulk':
				// Handle bulk operations based on bulk operation type
				const bulkOperationType = this.getNodeParameter(
					'bulkOperationType',
					itemIndex,
					'createMultiple',
				) as string;
				switch (bulkOperationType) {
					case 'updateMultiple':
						return await pinOperations.bulkUpdatePins.call(this, apiClient, itemIndex);
					case 'deleteMultiple':
						return await pinOperations.bulkDeletePins.call(this, apiClient, itemIndex);
					default:
						return await pinOperations.bulkGetPins.call(this, apiClient, itemIndex);
				}
			default:
				throw new NodeOperationError(this.getNode(), `Unsupported pin operation: ${operation}`, {
					itemIndex,
				});
		}
	}

	/**
	 * Routes board operations to specific handlers
	 */
	private static async routeBoardOperation(
		this: IExecuteFunctions,
		operation: string,
		apiClient: PinterestApiClient,
		itemIndex: number,
	): Promise<INodeExecutionData | INodeExecutionData[]> {
		switch (operation) {
			case 'create':
				return await boardOperations.createBoard.call(this, apiClient, itemIndex);
			case 'get':
				return await boardOperations.getBoard.call(this, apiClient, itemIndex);
			case 'update':
				return await boardOperations.updateBoard.call(this, apiClient, itemIndex);
			case 'delete':
				return await boardOperations.deleteBoard.call(this, apiClient, itemIndex);
			case 'bulk':
				// Handle bulk operations based on bulk operation type
				const bulkOperationType = this.getNodeParameter(
					'bulkOperationType',
					itemIndex,
					'getMultiple',
				) as string;
				switch (bulkOperationType) {
					case 'updateMultiple':
						return await boardOperations.bulkUpdateBoards.call(this, apiClient, itemIndex);
					case 'deleteMultiple':
						return await boardOperations.bulkDeleteBoards.call(this, apiClient, itemIndex);
					default:
						return await boardOperations.bulkGetBoards.call(this, apiClient, itemIndex);
				}
			default:
				throw new NodeOperationError(this.getNode(), `Unsupported board operation: ${operation}`, {
					itemIndex,
				});
		}
	}

	/**
	 * Routes user operations to specific handlers
	 */
	private static async routeUserOperation(
		this: IExecuteFunctions,
		operation: string,
		apiClient: PinterestApiClient,
		itemIndex: number,
	): Promise<INodeExecutionData> {
		switch (operation) {
			case 'getProfile':
				return await userOperations.getUserProfile.call(this, apiClient, itemIndex);
			case 'getAnalytics':
				return await userOperations.getUserAnalytics.call(this, apiClient, itemIndex);
			case 'getPinAnalytics':
				return await userOperations.getPinAnalytics.call(this, apiClient, itemIndex);
			case 'getBoardAnalytics':
				return await userOperations.getBoardAnalytics.call(this, apiClient, itemIndex);
			default:
				throw new NodeOperationError(this.getNode(), `Unsupported user operation: ${operation}`, {
					itemIndex,
				});
		}
	}

	/**
	 * Routes search operations to specific handlers
	 */
	private static async routeSearchOperation(
		this: IExecuteFunctions,
		operation: string,
		apiClient: PinterestApiClient,
		itemIndex: number,
	): Promise<INodeExecutionData[]> {
		switch (operation) {
			case 'pins':
				return await searchOperations.searchPins.call(this, apiClient, itemIndex);
			case 'boards':
				return await searchOperations.searchBoards.call(this, apiClient, itemIndex);
			case 'trending':
				return await searchOperations.getTrending.call(this, apiClient, itemIndex);
			default:
				throw new NodeOperationError(this.getNode(), `Unsupported search operation: ${operation}`, {
					itemIndex,
				});
		}
	}

	/**
	 * Routes media operations to specific handlers
	 */
	private static async routeMediaOperation(
		this: IExecuteFunctions,
		operation: string,
		apiClient: PinterestApiClient,
		itemIndex: number,
	): Promise<INodeExecutionData> {
		switch (operation) {
			case 'upload':
				return await mediaOperations.uploadMedia.call(this, itemIndex);
			default:
				throw new NodeOperationError(this.getNode(), `Unsupported media operation: ${operation}`, {
					itemIndex,
				});
		}
	}

	/**
	 * Handles execution errors with proper context and error propagation
	 */
	private static handleExecutionError(
		this: IExecuteFunctions,
		error: any,
		itemIndex: number,
	): INodeExecutionData | null {
		// If continuing on fail, return error data
		if (this.continueOnFail()) {
			let resource = 'unknown';
			let operation = 'unknown';

			try {
				resource = this.getNodeParameter('resource', itemIndex, 'unknown') as string;
				operation = this.getNodeParameter('operation', itemIndex, 'unknown') as string;
			} catch {
				// If we can't get parameters, use defaults
			}

			return {
				json: {
					error: error.message || 'Unknown error occurred',
					errorType: error.constructor.name,
					resource,
					operation,
					itemIndex,
					timestamp: new Date().toISOString(),
					...(error.description && { description: error.description }),
					...(error.httpCode && { httpCode: error.httpCode }),
				},
				pairedItem: { item: itemIndex },
			};
		}

		// Return null to indicate error should be re-thrown
		return null;
	}

	/**
	 * Enhances error context with operation details
	 */
	private static enhanceErrorContext(
		error: any,
		resource: string,
		operation: string,
		itemIndex: number,
	): void {
		// Add context to error if it doesn't already have it
		if (error && typeof error === 'object') {
			error.resource = error.resource || resource;
			error.operation = error.operation || operation;
			error.itemIndex = error.itemIndex || itemIndex;
		}
	}
}
