import { DataTransformer } from '../DataTransformer';
import { NodeOperationError } from 'n8n-workflow';
import type {
	PinResponse,
	BoardResponse,
	UserProfileResponse,
	AnalyticsResponse,
	SearchPinsResponse,
	SearchBoardsResponse,
	TrendingResponse,
} from '../types';

describe('DataTransformer', () => {
	describe('transformPinResponse', () => {
		it('should transform complete pin response correctly', () => {
			// Arrange
			const pinResponse: PinResponse = {
				id: 'test-pin-id-123',
				created_at: '2023-01-01T12:00:00Z',
				url: 'https://pinterest.com/pin/test-pin-id-123',
				title: 'Test Pin Title',
				description: 'This is a test pin description',
				link: 'https://example.com/source',
				board_id: 'board-id-456',
				board_section_id: 'section-id-789',
				alt_text: 'Alternative text for accessibility',
				media: {
					url: 'https://pinterest.com/media/image123.jpg',
					media_type: 'image',
					width: 800,
					height: 600,
				},
				note: 'This is a pin note',
				creative_type: 'regular',
				is_owner: true,
				is_standard: true,
			};

			// Act
			const result = DataTransformer.transformPinResponse(pinResponse);

			// Assert
			expect(result).toEqual({
				pinId: 'test-pin-id-123',
				url: 'https://pinterest.com/pin/test-pin-id-123',
				title: 'Test Pin Title',
				description: 'This is a test pin description',
				link: 'https://example.com/source',
				altText: 'Alternative text for accessibility',
				boardId: 'board-id-456',
				boardSectionId: 'section-id-789',
				createdAt: '2023-01-01T12:00:00.000Z',
				mediaUrl: 'https://pinterest.com/media/image123.jpg',
				mediaType: 'image',
				mediaWidth: 800,
				mediaHeight: 600,
				note: 'This is a pin note',
				creativeType: 'regular',
				isOwner: true,
				isStandard: true,
			});
		});

		it('should handle pin response with minimal data', () => {
			// Arrange
			const pinResponse: PinResponse = {
				id: 'minimal-pin-id',
				created_at: '2023-01-01T12:00:00Z',
				url: 'https://pinterest.com/pin/minimal-pin-id',
				board_id: 'board-id-456',
				media: {
					url: 'https://pinterest.com/media/image123.jpg',
					media_type: 'image',
				},
			};

			// Act
			const result = DataTransformer.transformPinResponse(pinResponse);

			// Assert
			expect(result).toEqual({
				pinId: 'minimal-pin-id',
				url: 'https://pinterest.com/pin/minimal-pin-id',
				title: null,
				description: null,
				link: null,
				altText: null,
				boardId: 'board-id-456',
				boardSectionId: null,
				createdAt: '2023-01-01T12:00:00.000Z',
				mediaUrl: 'https://pinterest.com/media/image123.jpg',
				mediaType: 'image',
				mediaWidth: null,
				mediaHeight: null,
				note: null,
				creativeType: null,
				isOwner: false,
				isStandard: false,
			});
		});

		it('should handle pin response with empty strings', () => {
			// Arrange
			const pinResponse: PinResponse = {
				id: 'empty-strings-pin-id',
				created_at: '2023-01-01T12:00:00Z',
				url: 'https://pinterest.com/pin/empty-strings-pin-id',
				title: '',
				description: '',
				link: '',
				board_id: 'board-id-456',
				alt_text: '',
				media: {
					url: 'https://pinterest.com/media/image123.jpg',
					media_type: 'image',
				},
				note: '',
			};

			// Act
			const result = DataTransformer.transformPinResponse(pinResponse);

			// Assert
			expect(result).toEqual({
				pinId: 'empty-strings-pin-id',
				url: 'https://pinterest.com/pin/empty-strings-pin-id',
				title: null,
				description: null,
				link: null,
				altText: null,
				boardId: 'board-id-456',
				boardSectionId: null,
				createdAt: '2023-01-01T12:00:00.000Z',
				mediaUrl: 'https://pinterest.com/media/image123.jpg',
				mediaType: 'image',
				mediaWidth: null,
				mediaHeight: null,
				note: null,
				creativeType: null,
				isOwner: false,
				isStandard: false,
			});
		});

		it('should handle pin response with video media', () => {
			// Arrange
			const pinResponse: PinResponse = {
				id: 'video-pin-id',
				created_at: '2023-01-01T12:00:00Z',
				url: 'https://pinterest.com/pin/video-pin-id',
				title: 'Video Pin',
				board_id: 'board-id-456',
				media: {
					url: 'https://pinterest.com/media/video123.mp4',
					media_type: 'video',
					width: 1920,
					height: 1080,
				},
			};

			// Act
			const result = DataTransformer.transformPinResponse(pinResponse);

			// Assert
			expect(result).toEqual({
				pinId: 'video-pin-id',
				url: 'https://pinterest.com/pin/video-pin-id',
				title: 'Video Pin',
				description: null,
				link: null,
				altText: null,
				boardId: 'board-id-456',
				boardSectionId: null,
				createdAt: '2023-01-01T12:00:00.000Z',
				mediaUrl: 'https://pinterest.com/media/video123.mp4',
				mediaType: 'video',
				mediaWidth: 1920,
				mediaHeight: 1080,
				note: null,
				creativeType: null,
				isOwner: false,
				isStandard: false,
			});
		});

		it('should handle pin response with missing media object', () => {
			// Arrange
			const pinResponse: PinResponse = {
				id: 'no-media-pin-id',
				created_at: '2023-01-01T12:00:00Z',
				url: 'https://pinterest.com/pin/no-media-pin-id',
				board_id: 'board-id-456',
			} as PinResponse; // Type assertion to allow missing media

			// Act
			const result = DataTransformer.transformPinResponse(pinResponse);

			// Assert
			expect(result).toEqual({
				pinId: 'no-media-pin-id',
				url: 'https://pinterest.com/pin/no-media-pin-id',
				title: null,
				description: null,
				link: null,
				altText: null,
				boardId: 'board-id-456',
				boardSectionId: null,
				createdAt: '2023-01-01T12:00:00.000Z',
				mediaUrl: null,
				mediaType: null,
				mediaWidth: null,
				mediaHeight: null,
				note: null,
				creativeType: null,
				isOwner: false,
				isStandard: false,
			});
		});

		it('should handle boolean fields correctly', () => {
			// Arrange
			const pinResponse: PinResponse = {
				id: 'boolean-test-pin-id',
				created_at: '2023-01-01T12:00:00Z',
				url: 'https://pinterest.com/pin/boolean-test-pin-id',
				board_id: 'board-id-456',
				media: {
					url: 'https://pinterest.com/media/image123.jpg',
					media_type: 'image',
				},
				is_owner: false,
				is_standard: true,
			};

			// Act
			const result = DataTransformer.transformPinResponse(pinResponse);

			// Assert
			expect(result.isOwner).toBe(false);
			expect(result.isStandard).toBe(true);
		});

		it('should handle undefined boolean fields as false', () => {
			// Arrange
			const pinResponse: PinResponse = {
				id: 'undefined-boolean-pin-id',
				created_at: '2023-01-01T12:00:00Z',
				url: 'https://pinterest.com/pin/undefined-boolean-pin-id',
				board_id: 'board-id-456',
				media: {
					url: 'https://pinterest.com/media/image123.jpg',
					media_type: 'image',
				},
				// is_owner and is_standard are undefined
			};

			// Act
			const result = DataTransformer.transformPinResponse(pinResponse);

			// Assert
			expect(result.isOwner).toBe(false);
			expect(result.isStandard).toBe(false);
		});
	});

	describe('transformBoardResponse', () => {
		it('should transform complete board response correctly', () => {
			// Arrange
			const boardResponse: BoardResponse = {
				id: 'board-123',
				name: 'Test Board',
				description: 'This is a test board',
				created_at: '2023-01-01T12:00:00Z',
				url: 'https://pinterest.com/board/test-board',
				privacy: 'public',
				pin_count: 25,
				follower_count: 100,
				owner: {
					username: 'testuser',
				},
				cover_pin: {
					id: 'cover-pin-123',
					url: 'https://pinterest.com/pin/cover-pin-123',
				},
			};

			// Act
			const result = DataTransformer.transformBoardResponse(boardResponse);

			// Assert
			expect(result).toEqual({
				boardId: 'board-123',
				name: 'Test Board',
				description: 'This is a test board',
				url: 'https://pinterest.com/board/test-board',
				privacy: 'public',
				pinCount: 25,
				followerCount: 100,
				createdAt: '2023-01-01T12:00:00.000Z',
				ownerUsername: 'testuser',
				coverPinId: 'cover-pin-123',
				coverPinUrl: 'https://pinterest.com/pin/cover-pin-123',
			});
		});

		it('should handle board response with minimal data', () => {
			// Arrange
			const boardResponse: BoardResponse = {
				id: 'minimal-board',
				name: 'Minimal Board',
				created_at: '2023-01-01T12:00:00Z',
				url: 'https://pinterest.com/board/minimal-board',
				privacy: 'private',
				pin_count: 0,
				follower_count: 0,
			};

			// Act
			const result = DataTransformer.transformBoardResponse(boardResponse);

			// Assert
			expect(result).toEqual({
				boardId: 'minimal-board',
				name: 'Minimal Board',
				description: null,
				url: 'https://pinterest.com/board/minimal-board',
				privacy: 'private',
				pinCount: 0,
				followerCount: 0,
				createdAt: '2023-01-01T12:00:00.000Z',
				ownerUsername: null,
				coverPinId: null,
				coverPinUrl: null,
			});
		});
	});

	describe('transformUserProfile', () => {
		it('should transform complete user profile correctly', () => {
			// Arrange
			const userProfile: UserProfileResponse = {
				id: 'user-123',
				username: 'testuser',
				display_name: 'Test User',
				first_name: 'Test',
				last_name: 'User',
				bio: 'This is a test user bio',
				avatar_url: 'https://pinterest.com/avatar/user-123.jpg',
				profile_url: 'https://pinterest.com/testuser',
				account_type: 'business',
				website_url: 'https://example.com',
				is_verified_merchant: true,
			};

			// Act
			const result = DataTransformer.transformUserProfile(userProfile);

			// Assert
			expect(result).toEqual({
				userId: 'user-123',
				username: 'testuser',
				displayName: 'Test User',
				firstName: 'Test',
				lastName: 'User',
				bio: 'This is a test user bio',
				avatarUrl: 'https://pinterest.com/avatar/user-123.jpg',
				profileUrl: 'https://pinterest.com/testuser',
				accountType: 'business',
				websiteUrl: 'https://example.com',
				isVerifiedMerchant: true,
			});
		});

		it('should handle user profile with minimal data', () => {
			// Arrange
			const userProfile: UserProfileResponse = {
				id: 'minimal-user',
				username: 'minimaluser',
				display_name: 'Minimal User',
				first_name: '',
				last_name: '',
				bio: '',
				avatar_url: '',
				profile_url: '',
				account_type: 'personal',
			};

			// Act
			const result = DataTransformer.transformUserProfile(userProfile);

			// Assert
			expect(result).toEqual({
				userId: 'minimal-user',
				username: 'minimaluser',
				displayName: 'Minimal User',
				firstName: null,
				lastName: null,
				bio: null,
				avatarUrl: null,
				profileUrl: null,
				accountType: 'personal',
				websiteUrl: null,
				isVerifiedMerchant: false,
			});
		});
	});

	describe('transformSearchPinsResponse', () => {
		it('should transform search pins response correctly', () => {
			// Arrange
			const searchResponse: SearchPinsResponse = {
				items: [
					{
						id: 'pin-1',
						created_at: '2023-01-01T12:00:00Z',
						url: 'https://pinterest.com/pin/pin-1',
						title: 'Pin 1',
						board_id: 'board-1',
						media: {
							url: 'https://pinterest.com/media/pin-1.jpg',
							media_type: 'image',
						},
					},
					{
						id: 'pin-2',
						created_at: '2023-01-02T12:00:00Z',
						url: 'https://pinterest.com/pin/pin-2',
						title: 'Pin 2',
						board_id: 'board-2',
						media: {
							url: 'https://pinterest.com/media/pin-2.jpg',
							media_type: 'image',
						},
					},
				],
				bookmark: 'next-page-token',
			};

			// Act
			const result = DataTransformer.transformSearchPinsResponse(searchResponse);

			// Assert
			expect(result.totalItems).toBe(2);
			expect(result.bookmark).toBe('next-page-token');
			expect(Array.isArray(result.items)).toBe(true);
			expect(result.items).toHaveLength(2);
		});
	});

	describe('transformTrendingResponse', () => {
		it('should transform trending response correctly', () => {
			// Arrange
			const trendingResponse: TrendingResponse = {
				trends: [
					{
						keyword: 'trending-topic-1',
						pct_growth_wow: 25.5,
						pct_growth_yoy: 150.0,
						time_series: [
							{ date: '2023-01-01', value: 100 },
							{ date: '2023-01-02', value: 125 },
						],
					},
					{
						keyword: 'trending-topic-2',
						pct_growth_wow: 10.0,
					},
				],
			};

			// Act
			const result = DataTransformer.transformTrendingResponse(trendingResponse);

			// Assert
			expect(result.totalTrends).toBe(2);
			expect(result.trends).toHaveLength(2);
			expect((result.trends as any)[0]).toEqual({
				keyword: 'trending-topic-1',
				percentGrowthWeekOverWeek: 25.5,
				percentGrowthYearOverYear: 150.0,
				timeSeries: [
					{ date: '2023-01-01T00:00:00.000Z', value: 100 },
					{ date: '2023-01-02T00:00:00.000Z', value: 125 },
				],
			});
			expect((result.trends as any)[1]).toEqual({
				keyword: 'trending-topic-2',
				percentGrowthWeekOverWeek: 10.0,
				percentGrowthYearOverYear: null,
				timeSeries: null,
			});
		});
	});

	describe('validateInputData', () => {
		it('should pass validation for valid data with all required fields', () => {
			// Arrange
			const data = {
				boardId: 'board-123',
				title: 'Test Pin',
				mediaUrl: 'https://example.com/image.jpg',
			};
			const requiredFields = ['boardId', 'title'];

			// Act & Assert
			expect(() => {
				DataTransformer.validateInputData(data, requiredFields, 'pin creation');
			}).not.toThrow();
		});

		it('should throw error for missing required fields', () => {
			// Arrange
			const data = {
				title: 'Test Pin',
			};
			const requiredFields = ['boardId', 'title'];

			// Act & Assert
			expect(() => {
				DataTransformer.validateInputData(data, requiredFields, 'pin creation');
			}).toThrow(NodeOperationError);
		});

		it('should throw error for null or undefined data', () => {
			// Arrange
			const requiredFields = ['boardId'];

			// Act & Assert
			expect(() => {
				DataTransformer.validateInputData(null as any, requiredFields);
			}).toThrow(NodeOperationError);

			expect(() => {
				DataTransformer.validateInputData(undefined as any, requiredFields);
			}).toThrow(NodeOperationError);
		});

		it('should sanitize string fields', () => {
			// Arrange
			const data = {
				title: '  Test Pin  ',
				description: 'Description with\x00null byte',
			};
			const requiredFields: string[] = [];

			// Act
			DataTransformer.validateInputData(data, requiredFields);

			// Assert
			expect(data.title).toBe('Test Pin');
			expect(data.description).toBe('Description withnull byte');
		});
	});

	describe('validateFieldTypes', () => {
		it('should pass validation for correct field types', () => {
			// Arrange
			const data = {
				name: 'Test Board',
				privacy: 'public',
				pinCount: 25,
				isActive: true,
			};
			const validations = {
				name: { type: 'string', maxLength: 100 },
				privacy: { type: 'string', values: ['public', 'private', 'secret'] },
				pinCount: { type: 'number' },
				isActive: { type: 'boolean' },
			};

			// Act & Assert
			expect(() => {
				DataTransformer.validateFieldTypes(data, validations, 'board creation');
			}).not.toThrow();
		});

		it('should throw error for incorrect field types', () => {
			// Arrange
			const data = {
				name: 123, // Should be string
				pinCount: 'not-a-number', // Should be number
			};
			const validations = {
				name: { type: 'string' },
				pinCount: { type: 'number' },
			};

			// Act & Assert
			expect(() => {
				DataTransformer.validateFieldTypes(data, validations);
			}).toThrow(NodeOperationError);
		});

		it('should throw error for invalid enum values', () => {
			// Arrange
			const data = {
				privacy: 'invalid-privacy',
			};
			const validations = {
				privacy: { type: 'string', values: ['public', 'private', 'secret'] },
			};

			// Act & Assert
			expect(() => {
				DataTransformer.validateFieldTypes(data, validations);
			}).toThrow(NodeOperationError);
		});

		it('should throw error for strings exceeding max length', () => {
			// Arrange
			const data = {
				title: 'This is a very long title that exceeds the maximum allowed length',
			};
			const validations = {
				title: { type: 'string', maxLength: 20 },
			};

			// Act & Assert
			expect(() => {
				DataTransformer.validateFieldTypes(data, validations);
			}).toThrow(NodeOperationError);
		});
	});

	describe('sanitizeString', () => {
		it('should remove control characters and trim whitespace', () => {
			// Arrange
			const input = '  Test string with\x00null byte and\x01control chars  ';

			// Act
			const result = DataTransformer.sanitizeString(input);

			// Assert
			expect(result).toBe('Test string withnull byte andcontrol chars');
		});

		it('should convert empty strings to null', () => {
			// Arrange
			const input = '   ';

			// Act
			const result = DataTransformer.sanitizeString(input);

			// Assert
			expect(result).toBeNull();
		});

		it('should preserve newlines and tabs', () => {
			// Arrange
			const input = 'Line 1\nLine 2\tTabbed';

			// Act
			const result = DataTransformer.sanitizeString(input);

			// Assert
			expect(result).toBe('Line 1\nLine 2\tTabbed');
		});
	});

	describe('formatDateForApi', () => {
		it('should format Date object to YYYY-MM-DD', () => {
			// Arrange
			const date = new Date('2023-01-15T10:30:00Z');

			// Act
			const result = DataTransformer.formatDateForApi(date);

			// Assert
			expect(result).toBe('2023-01-15');
		});

		it('should format ISO date string to YYYY-MM-DD', () => {
			// Arrange
			const dateString = '2023-01-15T10:30:00Z';

			// Act
			const result = DataTransformer.formatDateForApi(dateString);

			// Assert
			expect(result).toBe('2023-01-15');
		});

		it('should return already formatted YYYY-MM-DD strings unchanged', () => {
			// Arrange
			const dateString = '2023-01-15';

			// Act
			const result = DataTransformer.formatDateForApi(dateString);

			// Assert
			expect(result).toBe('2023-01-15');
		});

		it('should throw error for invalid date strings', () => {
			// Arrange
			const invalidDate = 'not-a-date';

			// Act & Assert
			expect(() => {
				DataTransformer.formatDateForApi(invalidDate);
			}).toThrow(NodeOperationError);
		});
	});

	describe('formatDateFromApi', () => {
		it('should convert Pinterest API date to ISO format', () => {
			// Arrange
			const apiDate = '2023-01-15T10:30:00Z';

			// Act
			const result = DataTransformer.formatDateFromApi(apiDate);

			// Assert
			expect(result).toBe('2023-01-15T10:30:00.000Z');
		});

		it('should return null for invalid dates', () => {
			// Arrange
			const invalidDate = 'invalid-date';

			// Act
			const result = DataTransformer.formatDateFromApi(invalidDate);

			// Assert
			expect(result).toBeNull();
		});

		it('should return null for null or undefined input', () => {
			// Act & Assert
			expect(DataTransformer.formatDateFromApi(null as any)).toBeNull();
			expect(DataTransformer.formatDateFromApi(undefined as any)).toBeNull();
		});
	});

	describe('convertToNumber', () => {
		it('should convert valid number strings to numbers', () => {
			expect(DataTransformer.convertToNumber('123')).toBe(123);
			expect(DataTransformer.convertToNumber('123.45')).toBe(123.45);
			expect(DataTransformer.convertToNumber('-123')).toBe(-123);
		});

		it('should return numbers unchanged', () => {
			expect(DataTransformer.convertToNumber(123)).toBe(123);
			expect(DataTransformer.convertToNumber(123.45)).toBe(123.45);
		});

		it('should return null for invalid inputs', () => {
			expect(DataTransformer.convertToNumber('not-a-number')).toBeNull();
			expect(DataTransformer.convertToNumber(null)).toBeNull();
			expect(DataTransformer.convertToNumber(undefined)).toBeNull();
			expect(DataTransformer.convertToNumber('')).toBeNull();
			expect(DataTransformer.convertToNumber(NaN)).toBeNull();
		});
	});

	describe('convertToBoolean', () => {
		it('should convert boolean values correctly', () => {
			expect(DataTransformer.convertToBoolean(true)).toBe(true);
			expect(DataTransformer.convertToBoolean(false)).toBe(false);
		});

		it('should convert string values correctly', () => {
			expect(DataTransformer.convertToBoolean('true')).toBe(true);
			expect(DataTransformer.convertToBoolean('TRUE')).toBe(true);
			expect(DataTransformer.convertToBoolean('1')).toBe(true);
			expect(DataTransformer.convertToBoolean('yes')).toBe(true);
			expect(DataTransformer.convertToBoolean('false')).toBe(false);
			expect(DataTransformer.convertToBoolean('0')).toBe(false);
			expect(DataTransformer.convertToBoolean('no')).toBe(false);
		});

		it('should convert number values correctly', () => {
			expect(DataTransformer.convertToBoolean(1)).toBe(true);
			expect(DataTransformer.convertToBoolean(123)).toBe(true);
			expect(DataTransformer.convertToBoolean(0)).toBe(false);
			expect(DataTransformer.convertToBoolean(-1)).toBe(true);
		});

		it('should return false for other types', () => {
			expect(DataTransformer.convertToBoolean(null)).toBe(false);
			expect(DataTransformer.convertToBoolean(undefined)).toBe(false);
			expect(DataTransformer.convertToBoolean({})).toBe(false);
			expect(DataTransformer.convertToBoolean([])).toBe(false);
		});
	});

	describe('validatePinterestId', () => {
		it('should pass validation for valid Pinterest IDs', () => {
			expect(() => {
				DataTransformer.validatePinterestId('valid-pin-id-123', 'pin');
			}).not.toThrow();

			expect(() => {
				DataTransformer.validatePinterestId('board_id_456', 'board');
			}).not.toThrow();
		});

		it('should throw error for invalid Pinterest IDs', () => {
			expect(() => {
				DataTransformer.validatePinterestId('', 'pin');
			}).toThrow(NodeOperationError);

			expect(() => {
				DataTransformer.validatePinterestId('invalid@id', 'pin');
			}).toThrow(NodeOperationError);

			expect(() => {
				DataTransformer.validatePinterestId(null as any, 'pin');
			}).toThrow(NodeOperationError);
		});
	});

	describe('validateUrl', () => {
		it('should pass validation for valid URLs', () => {
			expect(() => {
				DataTransformer.validateUrl('https://example.com');
			}).not.toThrow();

			expect(() => {
				DataTransformer.validateUrl('http://pinterest.com/pin/123');
			}).not.toThrow();
		});

		it('should throw error for invalid URLs', () => {
			expect(() => {
				DataTransformer.validateUrl('not-a-url');
			}).toThrow(NodeOperationError);

			expect(() => {
				DataTransformer.validateUrl('');
			}).toThrow(NodeOperationError);

			expect(() => {
				DataTransformer.validateUrl(null as any);
			}).toThrow(NodeOperationError);
		});
	});

	describe('formatOutputData', () => {
		it('should format data for n8n output correctly', () => {
			// Arrange
			const data = { pinId: 'pin-123', title: 'Test Pin' };
			const itemIndex = 0;

			// Act
			const result = DataTransformer.formatOutputData(data, itemIndex);

			// Assert
			expect(result).toEqual({
				json: data,
				pairedItem: { item: 0 },
			});
		});
	});

	describe('formatArrayOutputData', () => {
		it('should format array data for n8n output correctly', () => {
			// Arrange
			const items = [
				{ pinId: 'pin-1', title: 'Pin 1' },
				{ pinId: 'pin-2', title: 'Pin 2' },
			];
			const itemIndex = 0;

			// Act
			const result = DataTransformer.formatArrayOutputData(items, itemIndex);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				json: { pinId: 'pin-1', title: 'Pin 1' },
				pairedItem: { item: 0 },
			});
			expect(result[1]).toEqual({
				json: { pinId: 'pin-2', title: 'Pin 2' },
				pairedItem: { item: 0 },
			});
		});
	});
});
