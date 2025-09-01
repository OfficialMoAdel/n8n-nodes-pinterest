import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { getUserProfile } from '../profile.operation';
import type { PinterestApiClient } from '../../../utils/PinterestApiClient';
import type { UserProfileResponse } from '../../../utils/types';
import { DataTransformer } from '../../../utils/DataTransformer';

// Mock the DataTransformer
jest.mock('../../../utils/DataTransformer');

describe('getUserProfile Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockApiClient: jest.Mocked<PinterestApiClient>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock IExecuteFunctions
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue({ name: 'Pinterest' }),
		} as unknown as jest.Mocked<IExecuteFunctions>;

		// Mock PinterestApiClient
		mockApiClient = {
			getUserProfile: jest.fn(),
		} as unknown as jest.Mocked<PinterestApiClient>;
	});

	it('should successfully retrieve user profile', async () => {
		// Arrange
		const mockUserProfile: UserProfileResponse = {
			id: 'user123',
			username: 'testuser',
			first_name: 'Test',
			last_name: 'User',
			display_name: 'Test User',
			bio: 'Test bio',
			avatar_url: 'https://example.com/avatar.jpg',
			profile_url: 'https://pinterest.com/testuser',
			account_type: 'personal',
			website_url: 'https://example.com',
			is_verified_merchant: false,
		};

		const mockTransformedProfile = {
			userId: 'user123',
			username: 'testuser',
			displayName: 'Test User',
			firstName: 'Test',
			lastName: 'User',
			bio: 'Test bio',
			avatarUrl: 'https://example.com/avatar.jpg',
			profileUrl: 'https://pinterest.com/testuser',
			accountType: 'personal',
			websiteUrl: 'https://example.com',
			isVerifiedMerchant: false,
		};

		mockApiClient.getUserProfile.mockResolvedValue(mockUserProfile);
		(DataTransformer.transformUserProfile as jest.Mock).mockReturnValue(mockTransformedProfile);

		// Act
		const result = await getUserProfile.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(mockApiClient.getUserProfile).toHaveBeenCalledTimes(1);
		expect(DataTransformer.transformUserProfile).toHaveBeenCalledWith(mockUserProfile);
		expect(result).toEqual({
			json: mockTransformedProfile,
			pairedItem: { item: 0 },
		});
	});

	it('should handle API errors gracefully', async () => {
		// Arrange
		const mockError = new Error('API Error');
		mockApiClient.getUserProfile.mockRejectedValue(mockError);

		// Act & Assert
		await expect(getUserProfile.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'API Error',
		);

		expect(mockApiClient.getUserProfile).toHaveBeenCalledTimes(1);
		expect(DataTransformer.transformUserProfile).not.toHaveBeenCalled();
	});

	it('should handle transformation errors', async () => {
		// Arrange
		const mockUserProfile: UserProfileResponse = {
			id: 'user123',
			username: 'testuser',
			first_name: 'Test',
			last_name: 'User',
			display_name: 'Test User',
			bio: 'Test bio',
			avatar_url: 'https://example.com/avatar.jpg',
			profile_url: 'https://pinterest.com/testuser',
			account_type: 'personal',
		};

		const transformError = new Error('Transformation failed');
		mockApiClient.getUserProfile.mockResolvedValue(mockUserProfile);
		(DataTransformer.transformUserProfile as jest.Mock).mockImplementation(() => {
			throw transformError;
		});

		// Act & Assert
		await expect(getUserProfile.call(mockExecuteFunctions, mockApiClient, 0)).rejects.toThrow(
			'Transformation failed',
		);

		expect(mockApiClient.getUserProfile).toHaveBeenCalledTimes(1);
		expect(DataTransformer.transformUserProfile).toHaveBeenCalledWith(mockUserProfile);
	});

	it('should work with minimal user profile data', async () => {
		// Arrange
		const mockUserProfile: UserProfileResponse = {
			id: 'user123',
			username: 'testuser',
			first_name: 'Test',
			last_name: 'User',
			display_name: 'Test User',
			bio: '',
			avatar_url: '',
			profile_url: 'https://pinterest.com/testuser',
			account_type: 'business',
		};

		const mockTransformedProfile = {
			userId: 'user123',
			username: 'testuser',
			displayName: 'Test User',
			firstName: 'Test',
			lastName: 'User',
			bio: null,
			avatarUrl: null,
			profileUrl: 'https://pinterest.com/testuser',
			accountType: 'business',
			websiteUrl: null,
			isVerifiedMerchant: false,
		};

		mockApiClient.getUserProfile.mockResolvedValue(mockUserProfile);
		(DataTransformer.transformUserProfile as jest.Mock).mockReturnValue(mockTransformedProfile);

		// Act
		const result = await getUserProfile.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(result).toEqual({
			json: mockTransformedProfile,
			pairedItem: { item: 0 },
		});
	});
});
