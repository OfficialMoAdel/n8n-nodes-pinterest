/**
 * Test data management for Pinterest integration tests
 */

import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { PinterestApiClient } from '../../utils/PinterestApiClient';
import { integrationConfig } from './config';
import type {
	PinResponse,
	BoardResponse,
	CreatePinRequest,
	CreateBoardRequest,
} from '../../utils/types';

export interface TestDataSet {
	boards: BoardResponse[];
	pins: PinResponse[];
	mediaFiles: TestMediaFile[];
}

export interface TestMediaFile {
	name: string;
	type: 'image' | 'video';
	url: string;
	size: number;
	format: string;
}

export class TestDataManager {
	private credentials: any;
	private createdResources: {
		boards: string[];
		pins: string[];
		mediaIds: string[];
	} = {
		boards: [],
		pins: [],
		mediaIds: [],
	};

	constructor(credentials: any) {
		this.credentials = credentials;
	}

	/**
	 * Create a mock API client for testing
	 */
	private createMockApiClient(): any {
		// For integration tests, we'll need to create a proper mock
		// This is a simplified version for now
		return {
			createBoard: async (data: any) => ({ id: 'test-board-' + Date.now(), ...data }),
			createPin: async (data: any) => ({ id: 'test-pin-' + Date.now(), ...data }),
			deleteBoard: async (id: string) => ({ success: true }),
			deletePin: async (id: string) => ({ success: true }),
		};
	}

	/**
	 * Set up test data for integration tests
	 */
	async setupTestData(): Promise<TestDataSet> {
		const testData: TestDataSet = {
			boards: [],
			pins: [],
			mediaFiles: this.getTestMediaFiles(),
		};

		// Create test boards
		testData.boards = await this.createTestBoards();

		// Create test pins
		testData.pins = await this.createTestPins(testData.boards[0]);

		return testData;
	}
	/**
	 * Create test boards for integration testing
	 */
	private async createTestBoards(): Promise<BoardResponse[]> {
		const boards: BoardResponse[] = [];
		const boardConfigs = [
			{
				name: `${integrationConfig.testData.testDataPrefix}public-board`,
				description: 'Test board for n8n Pinterest integration tests',
				privacy: 'public' as const,
			},
			{
				name: `${integrationConfig.testData.testDataPrefix}private-board`,
				description: 'Private test board for n8n Pinterest integration tests',
				privacy: 'protected' as const,
			},
		];

		const apiClient = this.createMockApiClient();

		for (const config of boardConfigs) {
			try {
				const board = await apiClient.createBoard(config);
				boards.push(board);
				this.createdResources.boards.push(board.id);
			} catch (error) {
				console.warn(`Failed to create test board ${config.name}:`, error);
			}
		}

		return boards;
	}

	/**
	 * Create test pins for integration testing
	 */
	private async createTestPins(testBoard: BoardResponse): Promise<PinResponse[]> {
		const pins: PinResponse[] = [];
		const pinConfigs: CreatePinRequest[] = [
			{
				board_id: testBoard.id,
				media_source: {
					source_type: 'image_url',
					url: 'https://picsum.photos/800/600?random=1',
				},
				title: `${integrationConfig.testData.testDataPrefix}test-pin-1`,
				description: 'Test pin created by n8n Pinterest integration tests',
				link: 'https://example.com/test-1',
				alt_text: 'Test image for Pinterest integration testing',
			},
			{
				board_id: testBoard.id,
				media_source: {
					source_type: 'image_url',
					url: 'https://picsum.photos/800/600?random=2',
				},
				title: `${integrationConfig.testData.testDataPrefix}test-pin-2`,
				description: 'Another test pin for n8n Pinterest integration tests',
				alt_text: 'Second test image for Pinterest integration testing',
			},
		];

		const apiClient = this.createMockApiClient();

		for (const config of pinConfigs) {
			try {
				const pin = await apiClient.createPin(config);
				pins.push(pin);
				this.createdResources.pins.push(pin.id);
			} catch (error) {
				console.warn(`Failed to create test pin:`, error);
			}
		}

		return pins;
	}
	/**
	 * Get test media files for upload testing
	 */
	private getTestMediaFiles(): TestMediaFile[] {
		return [
			{
				name: 'test-image-small.jpg',
				type: 'image',
				url: 'https://picsum.photos/400/300?random=test1',
				size: 50000, // ~50KB
				format: 'JPEG',
			},
			{
				name: 'test-image-large.jpg',
				type: 'image',
				url: 'https://picsum.photos/1920/1080?random=test2',
				size: 2000000, // ~2MB
				format: 'JPEG',
			},
			{
				name: 'test-image.png',
				type: 'image',
				url: 'https://picsum.photos/800/600.png?random=test3',
				size: 800000, // ~800KB
				format: 'PNG',
			},
		];
	}

	/**
	 * Clean up all created test data
	 */
	async cleanupTestData(): Promise<void> {
		if (!integrationConfig.testData.cleanupAfterTests) {
			console.log('Test data cleanup disabled, skipping cleanup');
			return;
		}

		console.log('Cleaning up Pinterest test data...');

		const apiClient = this.createMockApiClient();

		// Delete test pins
		for (const pinId of this.createdResources.pins) {
			try {
				await apiClient.deletePin(pinId);
				console.log(`Deleted test pin: ${pinId}`);
			} catch (error) {
				console.warn(`Failed to delete test pin ${pinId}:`, error);
			}
		}

		// Delete test boards (unless preservation is enabled)
		if (!integrationConfig.testData.preserveTestBoards) {
			for (const boardId of this.createdResources.boards) {
				try {
					await apiClient.deleteBoard(boardId);
					console.log(`Deleted test board: ${boardId}`);
				} catch (error) {
					console.warn(`Failed to delete test board ${boardId}:`, error);
				}
			}
		}

		// Clear tracking arrays
		this.createdResources = { boards: [], pins: [], mediaIds: [] };
	}

	/**
	 * Get created resource IDs for test validation
	 */
	getCreatedResources() {
		return { ...this.createdResources };
	}
}
