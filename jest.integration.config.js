/**
 * Jest configuration for Pinterest integration tests
 */

// Load environment variables from .env.integration if it exists
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.integration');
if (fs.existsSync(envPath)) {
	require('dotenv').config({ path: envPath });
}

module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/nodes/Pinterest/__tests__/integration'],
	testMatch: ['**/integration/**/*.test.ts'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	collectCoverageFrom: [
		'nodes/Pinterest/**/*.ts',
		'!nodes/Pinterest/__tests__/**',
		'!**/*.test.ts',
		'!**/*.spec.ts',
		'!**/node_modules/**',
		'!**/dist/**',
	],
	coverageDirectory: 'coverage/integration',
	coverageReporters: ['text', 'lcov', 'html'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	testTimeout: 60000, // 60 seconds for integration tests
	globalSetup: '<rootDir>/nodes/Pinterest/__tests__/integration/setup.ts',
	verbose: true,
	detectOpenHandles: true,
	forceExit: true,
	maxWorkers: 1, // Run integration tests sequentially to avoid rate limiting
	testSequencer: '<rootDir>/nodes/Pinterest/__tests__/integration/testSequencer.js',
};
