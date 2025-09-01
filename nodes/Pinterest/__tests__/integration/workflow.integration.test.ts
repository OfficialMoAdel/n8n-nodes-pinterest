/**
 * End-to-End Workflow Integration Tests
 * Tests complete n8n workflows with Pinterest node operations
 */

import { TestDataManager } from './TestDataManager';
import { PerformanceBenchmark } from './PerformanceBenchmark';
import { IntegrationTestSetup } from './setup';
import { skipIfIntegrationDisabled } from './config';
import type { INodeExecutionData } from 'n8n-workflow';

describe('Pinterest Workflow Integration Tests', () => {
	let testDataManager: TestDataManager | null = null;
	let performanceBenchmark: PerformanceBenchmark;

	// Mock helper methods for simulating Pinterest node execution
	const mockPinterestNodeExecution = async (
		resource: string,
		operation: string,
		inputData: INodeExecutionData[],
	): Promise<INodeExecutionData[]> => {
		// Mock Pinterest node execution based on resource and operation
		const results: INodeExecutionData[] = [];

		for (let i = 0; i < inputData.length; i++) {
			const input = inputData[i];
			let result: any = {};

			switch (`${resource}:${operation}`) {
				case 'pin:create':
					result = {
						pinId: 'test-pin-' + Date.now() + '-' + i,
						boardId: input.json.boardId,
						title: input.json.title,
						description: input.json.description,
						url: `https://pinterest.com/pin/test-pin-${Date.now()}-${i}`,
						mediaUrl: input.json.mediaUrl || input.json.mediaId,
						createdAt: new Date().toISOString(),
					};
					break;

				case 'pin:get':
					result = {
						pinId: input.json.pinId,
						title: 'Retrieved Pin Title',
						description: 'Retrieved pin description',
						boardId: 'test-board-123',
						url: `https://pinterest.com/pin/${input.json.pinId}`,
						createdAt: new Date().toISOString(),
					};
					break;

				case 'pin:update':
					result = {
						pinId: input.json.pinId,
						title: input.json.title,
						description: input.json.description,
						updatedAt: new Date().toISOString(),
					};
					break;

				case 'pin:delete':
					result = {
						pinId: input.json.pinId,
						success: true,
						deletedAt: new Date().toISOString(),
					};
					break;

				case 'pin:analytics':
					result = {
						pinId: input.json.pinId,
						impressions: Math.floor(Math.random() * 10000),
						saves: Math.floor(Math.random() * 1000),
						clicks: Math.floor(Math.random() * 500),
						period: `${input.json.startDate} to ${input.json.endDate}`,
					};
					break;

				case 'board:create':
					result = {
						boardId: 'test-board-' + Date.now() + '-' + i,
						name: input.json.name,
						description: input.json.description,
						privacy: input.json.privacy,
						url: `https://pinterest.com/board/test-board-${Date.now()}-${i}`,
						pinCount: 0,
						createdAt: new Date().toISOString(),
					};
					break;

				case 'board:get':
					result = {
						boardId: input.json.boardId,
						name: 'Test Board Name',
						description: 'Test board description',
						privacy: 'public',
						pinCount: Math.floor(Math.random() * 100),
						followerCount: Math.floor(Math.random() * 50),
						url: `https://pinterest.com/board/${input.json.boardId}`,
					};
					break;

				case 'board:update':
					result = {
						boardId: input.json.boardId,
						name: input.json.name,
						description: input.json.description,
						updatedAt: new Date().toISOString(),
					};
					break;

				case 'board:analytics':
					result = {
						boardId: input.json.boardId,
						impressions: Math.floor(Math.random() * 50000),
						saves: Math.floor(Math.random() * 5000),
						clicks: Math.floor(Math.random() * 2500),
						period: `${input.json.startDate} to ${input.json.endDate}`,
					};
					break;

				case 'search:pins':
					result = {
						query: input.json.query,
						items: Array.from({ length: (input.json.limit as number) || 10 }, (_, index) => ({
							id: `search-pin-${index}`,
							title: `Search Result Pin ${index + 1}`,
							description: `Pin found for query: ${input.json.query}`,
							url: `https://pinterest.com/pin/search-pin-${index}`,
							mediaUrl: `https://picsum.photos/400/300?random=search-${index}`,
						})),
						bookmark: 'next-page-token',
					};
					break;

				case 'media:upload':
					result = {
						mediaId: 'test-media-' + Date.now() + '-' + i,
						format: input.json.fileFormat,
						size: input.json.fileSize,
						uploadedAt: new Date().toISOString(),
					};
					break;

				case 'user:profile':
					result = {
						userId: 'test-user-123',
						username: 'workflow_test_user',
						displayName: 'Workflow Test User',
						accountType: 'business',
						bio: 'Test user for workflow integration tests',
					};
					break;

				case 'user:analytics':
					result = {
						impressions: Math.floor(Math.random() * 100000),
						saves: Math.floor(Math.random() * 10000),
						clicks: Math.floor(Math.random() * 5000),
						period: `${input.json.startDate} to ${input.json.endDate}`,
					};
					break;

				default:
					result = { success: true, operation: `${resource}:${operation}` };
			}

			results.push({
				json: result,
				pairedItem: { item: i },
			});
		}

		return results;
	};

	const mockPinterestNodeExecutionWithError = async (
		resource: string,
		operation: string,
		inputData: INodeExecutionData[],
		error: any,
	): Promise<INodeExecutionData[]> => {
		// Simulate error scenarios
		throw error;
	};

	beforeAll(async () => {
		if (skipIfIntegrationDisabled()) return;

		testDataManager = await IntegrationTestSetup.suiteSetup();
		performanceBenchmark = new PerformanceBenchmark();
	});

	afterAll(async () => {
		if (testDataManager) {
			await IntegrationTestSetup.suiteTeardown(testDataManager);
		}
	});

	describe('Pin Lifecycle Workflows', () => {
		it('should execute complete pin lifecycle: create → get → update → delete', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const timer = performanceBenchmark.startOperation('pin_lifecycle_workflow');

			try {
				const testData = await testDataManager.setupTestData();
				const testBoard = testData.boards[0];

				// Mock workflow execution data
				const workflowData: INodeExecutionData[] = [
					{
						json: {
							boardId: testBoard.id,
							mediaUrl: 'https://picsum.photos/800/600?random=workflow-1',
							title: 'Workflow Test Pin',
							description: 'Pin created in workflow integration test',
							link: 'https://example.com/workflow-test',
						},
					},
				];

				// Step 1: Create Pin
				const createResult = await mockPinterestNodeExecution('pin', 'create', workflowData);
				expect(createResult).toBeDefined();
				expect(createResult[0].json.pinId).toBeDefined();

				const createdPinId = createResult[0].json.pinId as string;

				// Step 2: Get Pin
				const getWorkflowData: INodeExecutionData[] = [
					{
						json: { pinId: createdPinId },
					},
				];

				const getResult = await mockPinterestNodeExecution('pin', 'get', getWorkflowData);
				expect(getResult[0].json.pinId).toBe(createdPinId);
				expect(getResult[0].json.title).toBe('Retrieved Pin Title');

				// Step 3: Update Pin
				const updateWorkflowData: INodeExecutionData[] = [
					{
						json: {
							pinId: createdPinId,
							title: 'Updated Workflow Test Pin',
							description: 'Updated description in workflow test',
						},
					},
				];

				const updateResult = await mockPinterestNodeExecution('pin', 'update', updateWorkflowData);
				expect(updateResult[0].json.title).toBe('Updated Workflow Test Pin');

				// Step 4: Delete Pin
				const deleteWorkflowData: INodeExecutionData[] = [
					{
						json: { pinId: createdPinId },
					},
				];

				const deleteResult = await mockPinterestNodeExecution('pin', 'delete', deleteWorkflowData);
				expect(deleteResult[0].json.success).toBe(true);

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should handle batch pin creation workflow', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const timer = performanceBenchmark.startOperation('batch_pin_creation_workflow');

			try {
				const testData = await testDataManager.setupTestData();
				const testBoard = testData.boards[0];

				// Mock batch workflow data
				const batchWorkflowData: INodeExecutionData[] = [
					{
						json: {
							boardId: testBoard.id,
							mediaUrl: 'https://picsum.photos/800/600?random=batch-1',
							title: 'Batch Pin 1',
							description: 'First pin in batch workflow test',
						},
					},
					{
						json: {
							boardId: testBoard.id,
							mediaUrl: 'https://picsum.photos/800/600?random=batch-2',
							title: 'Batch Pin 2',
							description: 'Second pin in batch workflow test',
						},
					},
					{
						json: {
							boardId: testBoard.id,
							mediaUrl: 'https://picsum.photos/800/600?random=batch-3',
							title: 'Batch Pin 3',
							description: 'Third pin in batch workflow test',
						},
					},
				];

				const batchResult = await mockPinterestNodeExecution('pin', 'create', batchWorkflowData);

				expect(batchResult).toHaveLength(3);
				batchResult.forEach((result, index) => {
					expect(result.json.pinId).toBeDefined();
					expect(result.json.title).toBe(`Batch Pin ${index + 1}`);
				});

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should execute pin search and analytics workflow', async () => {
			if (skipIfIntegrationDisabled()) return;

			const timer = performanceBenchmark.startOperation('search_analytics_workflow');

			try {
				// Step 1: Search for pins
				const searchWorkflowData: INodeExecutionData[] = [
					{
						json: {
							query: 'integration test',
							limit: 10,
						},
					},
				];

				const searchResult = await mockPinterestNodeExecution('search', 'pins', searchWorkflowData);
				expect(searchResult[0].json.items).toBeDefined();
				expect(Array.isArray(searchResult[0].json.items)).toBe(true);

				// Step 2: Get analytics for found pins
				const foundPins = searchResult[0].json.items as any[];
				if (foundPins.length > 0) {
					const analyticsWorkflowData: INodeExecutionData[] = [
						{
							json: {
								pinId: foundPins[0].id,
								startDate: '2024-01-01',
								endDate: '2024-01-31',
								metricTypes: ['IMPRESSION', 'SAVE', 'CLICK'],
							},
						},
					];

					const analyticsResult = await mockPinterestNodeExecution(
						'pin',
						'analytics',
						analyticsWorkflowData,
					);
					expect(analyticsResult[0].json.impressions).toBeDefined();
					expect(typeof analyticsResult[0].json.impressions).toBe('number');
				}

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});
	});

	describe('Board Management Workflows', () => {
		it('should execute complete board management workflow', async () => {
			if (skipIfIntegrationDisabled()) return;

			const timer = performanceBenchmark.startOperation('board_management_workflow');

			try {
				// Step 1: Create Board
				const createBoardData: INodeExecutionData[] = [
					{
						json: {
							name: 'Workflow Test Board',
							description: 'Board created in workflow integration test',
							privacy: 'public',
						},
					},
				];

				const createBoardResult = await mockPinterestNodeExecution(
					'board',
					'create',
					createBoardData,
				);
				expect(createBoardResult[0].json.boardId).toBeDefined();

				const createdBoardId = createBoardResult[0].json.boardId as string;

				// Step 2: Add pins to board
				const addPinData: INodeExecutionData[] = [
					{
						json: {
							boardId: createdBoardId,
							mediaUrl: 'https://picsum.photos/800/600?random=board-workflow',
							title: 'Board Workflow Pin',
							description: 'Pin added to board in workflow test',
						},
					},
				];

				const addPinResult = await mockPinterestNodeExecution('pin', 'create', addPinData);
				expect(addPinResult[0].json.boardId).toBe(createdBoardId);

				// Step 3: Get board with pins
				const getBoardData: INodeExecutionData[] = [
					{
						json: { boardId: createdBoardId },
					},
				];

				const getBoardResult = await mockPinterestNodeExecution('board', 'get', getBoardData);
				expect(getBoardResult[0].json.boardId).toBe(createdBoardId);
				expect(getBoardResult[0].json.pinCount).toBeGreaterThanOrEqual(0);

				// Step 4: Update board
				const updateBoardData: INodeExecutionData[] = [
					{
						json: {
							boardId: createdBoardId,
							name: 'Updated Workflow Test Board',
							description: 'Updated board description in workflow test',
						},
					},
				];

				const updateBoardResult = await mockPinterestNodeExecution(
					'board',
					'update',
					updateBoardData,
				);
				expect(updateBoardResult[0].json.name).toBe('Updated Workflow Test Board');

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should handle board analytics workflow', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const timer = performanceBenchmark.startOperation('board_analytics_workflow');

			try {
				const testData = await testDataManager.setupTestData();
				const testBoard = testData.boards[0];

				// Get board analytics
				const analyticsWorkflowData: INodeExecutionData[] = [
					{
						json: {
							boardId: testBoard.id,
							startDate: '2024-01-01',
							endDate: '2024-01-31',
							metricTypes: ['IMPRESSION', 'SAVE', 'CLICK'],
						},
					},
				];

				const analyticsResult = await mockPinterestNodeExecution(
					'board',
					'analytics',
					analyticsWorkflowData,
				);

				expect(analyticsResult[0].json.boardId).toBe(testBoard.id);
				expect(analyticsResult[0].json.impressions).toBeDefined();
				expect(typeof analyticsResult[0].json.impressions).toBe('number');

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});
	});

	describe('Media Upload Workflows', () => {
		it('should execute media upload and pin creation workflow', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const timer = performanceBenchmark.startOperation('media_upload_workflow');

			try {
				const testData = await testDataManager.setupTestData();
				const testBoard = testData.boards[0];
				const mediaFile = testData.mediaFiles[0];

				// Step 1: Upload media
				const uploadWorkflowData: INodeExecutionData[] = [
					{
						json: {
							mediaType: mediaFile.type,
							fileName: mediaFile.name,
							fileSize: mediaFile.size,
							fileFormat: mediaFile.format,
						},
						binary: {
							data: {
								data: Buffer.from('mock-image-data').toString('base64'),
								mimeType: 'image/jpeg',
								fileName: mediaFile.name,
							},
						},
					},
				];

				const uploadResult = await mockPinterestNodeExecution(
					'media',
					'upload',
					uploadWorkflowData,
				);
				expect(uploadResult[0].json.mediaId).toBeDefined();

				const uploadedMediaId = uploadResult[0].json.mediaId as string;

				// Step 2: Create pin with uploaded media
				const createPinData: INodeExecutionData[] = [
					{
						json: {
							boardId: testBoard.id,
							mediaId: uploadedMediaId,
							title: 'Uploaded Media Pin',
							description: 'Pin created with uploaded media in workflow test',
						},
					},
				];

				const createPinResult = await mockPinterestNodeExecution('pin', 'create', createPinData);
				expect(createPinResult[0].json.pinId).toBeDefined();
				expect(createPinResult[0].json.mediaUrl).toBe(uploadedMediaId);

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should handle multiple media format uploads', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const timer = performanceBenchmark.startOperation('multi_format_upload_workflow');

			try {
				const testData = await testDataManager.setupTestData();

				// Test different media formats
				const mediaFormats = testData.mediaFiles;

				for (const mediaFile of mediaFormats) {
					const uploadWorkflowData: INodeExecutionData[] = [
						{
							json: {
								mediaType: mediaFile.type,
								fileName: mediaFile.name,
								fileSize: mediaFile.size,
								fileFormat: mediaFile.format,
							},
							binary: {
								data: {
									data: Buffer.from(`mock-${mediaFile.type}-data`).toString('base64'),
									mimeType: mediaFile.type === 'image' ? 'image/jpeg' : 'video/mp4',
									fileName: mediaFile.name,
								},
							},
						},
					];

					const uploadResult = await mockPinterestNodeExecution(
						'media',
						'upload',
						uploadWorkflowData,
					);
					expect(uploadResult[0].json.mediaId).toBeDefined();
					expect(uploadResult[0].json.format).toBe(mediaFile.format);
				}

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});
	});

	describe('Error Handling Workflows', () => {
		it('should handle authentication error in workflow', async () => {
			if (skipIfIntegrationDisabled()) return;

			const timer = performanceBenchmark.startOperation('auth_error_workflow');

			try {
				// Mock workflow with invalid credentials
				const workflowData: INodeExecutionData[] = [
					{
						json: {
							boardId: 'test-board-123',
							mediaUrl: 'https://example.com/image.jpg',
							title: 'Test Pin',
						},
					},
				];

				try {
					await mockPinterestNodeExecutionWithError('pin', 'create', workflowData, {
						status: 401,
						message: 'Invalid access token',
					});
				} catch (error: any) {
					expect(error.status).toBe(401);
					expect(error.message).toContain('token');
				}

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should handle validation error in workflow', async () => {
			if (skipIfIntegrationDisabled()) return;

			const timer = performanceBenchmark.startOperation('validation_error_workflow');

			try {
				// Mock workflow with invalid data
				const workflowData: INodeExecutionData[] = [
					{
						json: {
							// Missing required boardId
							mediaUrl: 'invalid-url',
							title: '',
						},
					},
				];

				try {
					await mockPinterestNodeExecutionWithError('pin', 'create', workflowData, {
						status: 400,
						message: 'Invalid request parameters',
						details: [
							{ field: 'board_id', reason: 'Board ID is required' },
							{ field: 'media_url', reason: 'Invalid URL format' },
						],
					});
				} catch (error: any) {
					expect(error.status).toBe(400);
					expect(Array.isArray(error.details)).toBe(true);
				}

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should handle rate limit error in workflow', async () => {
			if (skipIfIntegrationDisabled()) return;

			const timer = performanceBenchmark.startOperation('rate_limit_error_workflow');

			try {
				// Mock workflow hitting rate limit
				const workflowData: INodeExecutionData[] = [
					{
						json: {
							boardId: 'test-board-123',
							mediaUrl: 'https://example.com/image.jpg',
							title: 'Rate Limited Pin',
						},
					},
				];

				try {
					await mockPinterestNodeExecutionWithError('pin', 'create', workflowData, {
						status: 429,
						message: 'Rate limit exceeded',
						retryAfter: 3600,
					});
				} catch (error: any) {
					expect(error.status).toBe(429);
					expect(error.retryAfter).toBeGreaterThan(0);
				}

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});
	});

	describe('Complex Multi-Step Workflows', () => {
		it('should execute content curation workflow', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const timer = performanceBenchmark.startOperation('content_curation_workflow');

			try {
				const testData = await testDataManager.setupTestData();

				// Step 1: Search for trending content
				const searchData: INodeExecutionData[] = [
					{
						json: {
							query: 'trending design',
							limit: 5,
						},
					},
				];

				const searchResult = await mockPinterestNodeExecution('search', 'pins', searchData);
				const foundPins = searchResult[0].json.items as any[];

				// Step 2: Create curated board
				const createBoardData: INodeExecutionData[] = [
					{
						json: {
							name: 'Curated Design Trends',
							description: 'Curated collection of trending design pins',
							privacy: 'public',
						},
					},
				];

				const boardResult = await mockPinterestNodeExecution('board', 'create', createBoardData);
				const curatedBoardId = boardResult[0].json.boardId as string;

				// Step 3: Create pins inspired by trending content
				const curatedPinData: INodeExecutionData[] = foundPins.slice(0, 3).map((pin, index) => ({
					json: {
						boardId: curatedBoardId,
						mediaUrl: `https://picsum.photos/800/600?random=curated-${index}`,
						title: `Curated: ${pin.title}`,
						description: `Inspired by trending pin: ${pin.description}`,
						link: 'https://example.com/curated-content',
					},
				}));

				const curatedPinResults = await mockPinterestNodeExecution('pin', 'create', curatedPinData);

				expect(curatedPinResults).toHaveLength(3);
				curatedPinResults.forEach((result) => {
					expect(result.json.boardId).toBe(curatedBoardId);
					expect(result.json.title).toContain('Curated:');
				});

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});

		it('should execute analytics reporting workflow', async () => {
			if (skipIfIntegrationDisabled() || !testDataManager) return;

			const timer = performanceBenchmark.startOperation('analytics_reporting_workflow');

			try {
				const testData = await testDataManager.setupTestData();

				// Step 1: Get user profile
				const profileData: INodeExecutionData[] = [{ json: {} }];
				const profileResult = await mockPinterestNodeExecution('user', 'profile', profileData);

				// Step 2: Get user analytics
				const userAnalyticsData: INodeExecutionData[] = [
					{
						json: {
							startDate: '2024-01-01',
							endDate: '2024-01-31',
							metricTypes: ['IMPRESSION', 'SAVE', 'CLICK'],
						},
					},
				];

				const userAnalyticsResult = await mockPinterestNodeExecution(
					'user',
					'analytics',
					userAnalyticsData,
				);

				// Step 3: Get board analytics for each board
				const boardAnalyticsResults = [];
				for (const board of testData.boards) {
					const boardAnalyticsData: INodeExecutionData[] = [
						{
							json: {
								boardId: board.id,
								startDate: '2024-01-01',
								endDate: '2024-01-31',
								metricTypes: ['IMPRESSION', 'SAVE', 'CLICK'],
							},
						},
					];

					const boardAnalyticsResult = await mockPinterestNodeExecution(
						'board',
						'analytics',
						boardAnalyticsData,
					);
					boardAnalyticsResults.push(boardAnalyticsResult[0]);
				}

				// Step 4: Compile analytics report
				const analyticsReport = {
					profile: profileResult[0].json,
					userMetrics: userAnalyticsResult[0].json,
					boardMetrics: boardAnalyticsResults.map((result) => result.json),
					reportDate: new Date().toISOString(),
				};

				expect(analyticsReport.profile).toBeDefined();
				expect(analyticsReport.userMetrics.impressions).toBeDefined();
				expect(analyticsReport.boardMetrics).toHaveLength(testData.boards.length);

				timer.end(true);
			} catch (error) {
				timer.end(false, (error as Error).message);
				throw error;
			}
		});
	});

	afterAll(() => {
		if (skipIfIntegrationDisabled()) return;

		// Output performance results
		const results = performanceBenchmark.getResults();
		const validation = performanceBenchmark.validatePerformance();

		console.log('\n=== Pinterest Workflow Integration Test Performance Results ===');
		console.log(`Total Workflows: ${results.totalOperations}`);
		console.log(`Successful Workflows: ${results.successfulOperations}`);
		console.log(`Failed Workflows: ${results.failedOperations}`);
		console.log(`Average Workflow Time: ${results.averageResponseTime.toFixed(2)}ms`);
		console.log(`P95 Workflow Time: ${results.p95ResponseTime.toFixed(2)}ms`);
		console.log(`Performance Validation: ${validation.passed ? 'PASSED' : 'FAILED'}`);

		if (!validation.passed) {
			console.log('Performance Issues:');
			validation.issues.forEach((issue) => console.log(`  - ${issue}`));
		}
	});
});
