/**
 * Integration test setup and teardown utilities
 */

import { TestDataManager } from './TestDataManager';
import { integrationConfig } from './config';

// Global setup function for Jest
export default async function globalSetup(): Promise<void> {
	return IntegrationTestSetup.globalSetup();
}

// Global teardown function for Jest
export async function globalTeardown(): Promise<void> {
	return IntegrationTestSetup.globalTeardown();
}

export class IntegrationTestSetup {
	private static testDataManager: TestDataManager | null = null;

	/**
	 * Global setup for all integration tests
	 */
	static async globalSetup(): Promise<void> {
		if (!process.env.PINTEREST_INTEGRATION_TESTS) {
			console.log('Integration tests disabled - skipping setup');
			return;
		}

		console.log('Setting up Pinterest integration test environment...');

		// Validate required environment variables
		const requiredEnvVars = [
			'PINTEREST_CLIENT_ID',
			'PINTEREST_CLIENT_SECRET',
			'PINTEREST_ACCESS_TOKEN',
		];

		const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
		if (missingVars.length > 0) {
			throw new Error(
				`Missing required environment variables for Pinterest integration tests: ${missingVars.join(', ')}\n` +
					'Please set these variables or disable integration tests by removing PINTEREST_INTEGRATION_TESTS=true',
			);
		}

		// Validate Pinterest API connectivity
		try {
			const testCredentials: any = {
				clientId: process.env.PINTEREST_CLIENT_ID!,
				clientSecret: process.env.PINTEREST_CLIENT_SECRET!,
				accessToken: process.env.PINTEREST_ACCESS_TOKEN!,
				refreshToken: process.env.PINTEREST_REFRESH_TOKEN || '',
				continuousRefresh: true,
			};

			this.testDataManager = new TestDataManager(testCredentials);

			// Test basic connectivity would require a full mock of IExecuteFunctions
			// For now, we'll just validate the credentials structure
			console.log('Pinterest credentials structure validated');
		} catch (error) {
			throw new Error(
				`Failed to connect to Pinterest API: ${(error as Error).message}\n` +
					'Please verify your Pinterest credentials and API access',
			);
		}

		console.log('Integration test environment setup complete');
	}

	/**
	 * Global teardown for all integration tests
	 */
	static async globalTeardown(): Promise<void> {
		if (!process.env.PINTEREST_INTEGRATION_TESTS || !this.testDataManager) {
			return;
		}

		console.log('Cleaning up Pinterest integration test environment...');

		try {
			await this.testDataManager.cleanupTestData();
			console.log('Integration test cleanup complete');
		} catch (error) {
			console.error('Error during integration test cleanup:', error);
		}
	}

	/**
	 * Setup for individual test suites
	 */
	static async suiteSetup(): Promise<TestDataManager | null> {
		if (!process.env.PINTEREST_INTEGRATION_TESTS) {
			return null;
		}

		const testCredentials: any = {
			clientId: process.env.PINTEREST_CLIENT_ID!,
			clientSecret: process.env.PINTEREST_CLIENT_SECRET!,
			accessToken: process.env.PINTEREST_ACCESS_TOKEN!,
			refreshToken: process.env.PINTEREST_REFRESH_TOKEN || '',
			continuousRefresh: true,
		};

		return new TestDataManager(testCredentials);
	}

	/**
	 * Cleanup for individual test suites
	 */
	static async suiteTeardown(testDataManager: TestDataManager): Promise<void> {
		if (testDataManager && integrationConfig.testData.cleanupAfterTests) {
			await testDataManager.cleanupTestData();
		}
	}
}
