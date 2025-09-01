import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { searchPins } from '../pins.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { SearchPinsResponse } from '../../../utils/types';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer', () => ({
	DataTransformer: {
		transformPinResponse: jest.fn((pin) => ({
			pinId: pin.id,
			title: pin.title,
			description: pin.description,
			url: pin.url,
			mediaUrl: pin.media?.url,
		})),
	},
}));

describe('Pinterest Search Pins Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockApiClient: jest.Mocked<PinterestApiClient>;
	let mockNode: any;

	beforeEach(() => {
		mockNode = {
			name: 'Pinterest',
			type: 'n8n-nodes-pinterest.pinterest',
		};

		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue(mockNode),
		} as any;

		mockApiClient = {
			searchPins: jest.fn(),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('successful pin search', () => {
		it('should search pins with basic parameters', async () => {
			// Arrange
			const mockResponse: SearchPinsResponse = {
				items: [
					{
						id: 'pin1',
						title: 'Test Pin 1',
						description: 'Test description 1',
						url: 'https://pinterest.com/pin/pin1',
						created_at: '2023-01-01T00:00:00Z',
						board_id: 'board1',
						media: {
							url: 'https://i.pinimg.com/test1.jpg',
							media_type: 'image',
						},
					},
					{
						id: 'pin2',
						title: 'Test Pin 2',
						description: 'Test description 2',
						url: 'https://pinterest.com/pin/pin2',
						created_at: '2023-01-02T00:00:00Z',
						board_id: 'board2',
						media: {
							url: 'https://i.pinimg.com/test2.jpg',
							media_type: 'image',
						},
					},
				],
				bookmark: 'next_page_token',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValue(mockResponse);

			// Act
			const result = await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchPins).toHaveBeenCalledWith({
				query: 'test query',
				limit: 25,
			});

			expect(result).toHaveLength(3); // 1 metadata + 2 pins
			expect(result[0].json).toEqual({
				searchQuery: 'test query',
				totalResults: 2,
				bookmark: 'next_page_token',
				hasMore: true,
			});

			expect(result[1].json).toEqual({
				pinId: 'pin1',
				title: 'Test Pin 1',
				description: 'Test description 1',
				url: 'https://pinterest.com/pin/pin1',
				mediaUrl: 'https://i.pinimg.com/test1.jpg',
			});
		});

		it('should search pins with all optional parameters', async () => {
			// Arrange
			const mockResponse: SearchPinsResponse = {
				items: [],
				bookmark: undefined,
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('advanced query') // query
				.mockReturnValueOnce(50) // limit
				.mockReturnValueOnce('bookmark123') // bookmark
				.mockReturnValueOnce(['regular', 'video']) // creativeTypes
				.mockReturnValueOnce('2023-01-01') // createdAt
				.mockReturnValueOnce(true) // isPromoted
				.mockReturnValueOnce(false) // hasProduct
				.mockReturnValueOnce(true); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValue(mockResponse);

			// Act
			const result = await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchPins).toHaveBeenCalledWith({
				query: 'advanced query',
				limit: 50,
				bookmark: 'bookmark123',
				creative_types: ['regular', 'video'],
				created_at: '2023-01-01',
				is_promoted: true,
				has_product: false,
				is_eligible_for_related_products: true,
			});

			expect(result).toHaveLength(1); // Only metadata
			expect(result[0].json).toEqual({
				searchQuery: 'advanced query',
				totalResults: 0,
				bookmark: undefined,
				hasMore: false,
			});
		});

		it('should handle empty search results', async () => {
			// Arrange
			const mockResponse: SearchPinsResponse = {
				items: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('no results query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValue(mockResponse);

			// Act
			const result = await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({
				searchQuery: 'no results query',
				totalResults: 0,
				bookmark: undefined,
				hasMore: false,
			});
		});
	});

	describe('parameter validation', () => {
		it('should throw error for empty query', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); // empty query

			// Act & Assert
			await expect(searchPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for whitespace-only query', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('   '); // whitespace query

			// Act & Assert
			await expect(searchPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for limit below 1', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('valid query') // query
				.mockReturnValueOnce(0); // invalid limit

			// Act & Assert
			await expect(searchPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for limit above 250', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('valid query') // query
				.mockReturnValueOnce(251); // invalid limit

			// Act & Assert
			await expect(searchPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should trim whitespace from query', async () => {
			// Arrange
			const mockResponse: SearchPinsResponse = {
				items: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('  trimmed query  ') // query with whitespace
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValue(mockResponse);

			// Act
			await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchPins).toHaveBeenCalledWith({
				query: 'trimmed query',
				limit: 25,
			});
		});
	});

	describe('error handling', () => {
		it('should handle API errors gracefully', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			const apiError = new Error('Pinterest API Error');
			mockApiClient.searchPins.mockRejectedValue(apiError);

			// Act & Assert
			await expect(searchPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should re-throw NodeOperationError without wrapping', async () => {
			// Arrange
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); // empty query

			// Act & Assert
			await expect(searchPins.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('pagination support', () => {
		it('should include bookmark in search parameters when provided', async () => {
			// Arrange
			const mockResponse: SearchPinsResponse = {
				items: [],
				bookmark: 'next_token',
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('current_token') // bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValue(mockResponse);

			// Act
			await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchPins).toHaveBeenCalledWith({
				query: 'test query',
				limit: 25,
				bookmark: 'current_token',
			});
		});

		it('should not include bookmark when empty string provided', async () => {
			// Arrange
			const mockResponse: SearchPinsResponse = {
				items: [],
			};

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('test query') // query
				.mockReturnValueOnce(25) // limit
				.mockReturnValueOnce('') // empty bookmark
				.mockReturnValueOnce([]) // creativeTypes
				.mockReturnValueOnce('') // createdAt
				.mockReturnValueOnce(undefined) // isPromoted
				.mockReturnValueOnce(undefined) // hasProduct
				.mockReturnValueOnce(undefined); // isEligibleForRelatedProducts

			mockApiClient.searchPins.mockResolvedValue(mockResponse);

			// Act
			await searchPins.call(mockExecuteFunctions, mockApiClient, 0);

			// Assert
			expect(mockApiClient.searchPins).toHaveBeenCalledWith({
				query: 'test query',
				limit: 25,
			});
		});
	});
});
