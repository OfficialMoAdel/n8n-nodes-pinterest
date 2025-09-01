/**
 * Integration test configuration for Pinterest API testing
 */

export interface IntegrationTestConfig {
	pinterest: {
		apiBaseUrl: string;
		sandboxMode: boolean;
		testAccountId?: string;
		rateLimitBuffer: number;
		requestTimeout: number;
	};
	performance: {
		maxResponseTime: number;
		maxBatchSize: number;
		concurrentRequests: number;
	};
	testData: {
		cleanupAfterTests: boolean;
		preserveTestBoards: boolean;
		testDataPrefix: string;
	};
}

export const integrationConfig: IntegrationTestConfig = {
	pinterest: {
		apiBaseUrl: process.env.PINTEREST_API_BASE_URL || 'https://api.pinterest.com/v5',
		sandboxMode: process.env.PINTEREST_SANDBOX_MODE === 'true',
		testAccountId: process.env.PINTEREST_TEST_ACCOUNT_ID,
		rateLimitBuffer: 0.1, // 10% buffer below rate limit
		requestTimeout: 30000, // 30 seconds
	},
	performance: {
		maxResponseTime: 5000, // 5 seconds max response time
		maxBatchSize: 25, // Pinterest API batch limit
		concurrentRequests: 5, // Safe concurrent request limit
	},
	testData: {
		cleanupAfterTests: process.env.PINTEREST_CLEANUP_TEST_DATA !== 'false',
		preserveTestBoards: process.env.PINTEREST_PRESERVE_TEST_BOARDS === 'true',
		testDataPrefix: 'n8n-test-',
	},
};

export const isIntegrationTestEnabled = (): boolean => {
	return (
		process.env.PINTEREST_INTEGRATION_TESTS === 'true' &&
		!!process.env.PINTEREST_ACCESS_TOKEN &&
		!!process.env.PINTEREST_CLIENT_ID
	);
};

export const skipIfIntegrationDisabled = () => {
	if (!isIntegrationTestEnabled()) {
		console.log(
			'Skipping Pinterest integration tests - set PINTEREST_INTEGRATION_TESTS=true and provide credentials',
		);
		return true;
	}
	return false;
};
