#!/usr/bin/env node

/**
 * Integration test runner script
 * Handles environment setup and test execution for CI/CD pipelines
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if integration tests should run
function shouldRunIntegrationTests() {
  // Check environment variable
  if (process.env.PINTEREST_INTEGRATION_TESTS !== 'true') {
    console.log('Integration tests disabled (PINTEREST_INTEGRATION_TESTS != true)');
    return false;
  }

  // Check required credentials
  const requiredEnvVars = [
    'PINTEREST_CLIENT_ID',
    'PINTEREST_CLIENT_SECRET',
    'PINTEREST_ACCESS_TOKEN',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.log(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.log('Skipping integration tests');
    return false;
  }

  return true;
}

// Load environment from .env.integration if it exists
function loadEnvironment() {
  const envPath = path.join(__dirname, '..', '.env.integration');
  if (fs.existsSync(envPath)) {
    console.log('Loading environment from .env.integration');
    require('dotenv').config({ path: envPath });
  }
}

// Run integration tests
function runIntegrationTests() {
  console.log('Starting Pinterest integration tests...');

  try {
    let testCommand = 'npm run test:integration';

    // Handle command line options
    if (process.argv.includes('--coverage')) {
      testCommand = 'npm run test:integration:coverage';
    }

    // Handle specific test suites
    if (process.argv.includes('--api-only')) {
      testCommand += ' -- --testPathPattern=pinterest-api.integration.test.ts';
    } else if (process.argv.includes('--workflow-only')) {
      testCommand += ' -- --testPathPattern=workflow.integration.test.ts';
    } else if (process.argv.includes('--performance-only')) {
      testCommand += ' -- --testPathPattern=performance.integration.test.ts';
    }

    // Add verbose output if requested
    if (process.argv.includes('--verbose')) {
      testCommand += ' -- --verbose';
    }

    console.log(`Executing: ${testCommand}`);

    execSync(testCommand, {
      stdio: 'inherit',
      env: { ...process.env }
    });

    console.log('Integration tests completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Integration tests failed:', error.message);
    process.exit(1);
  }
}

// Main execution
function main() {
  console.log('Pinterest Integration Test Runner');
  console.log('================================');

  // Load environment configuration
  loadEnvironment();

  // Check if tests should run
  if (!shouldRunIntegrationTests()) {
    console.log('Integration tests skipped');
    process.exit(0);
  }

  // Run the tests
  runIntegrationTests();
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Pinterest Integration Test Runner

Usage: node scripts/run-integration-tests.js [options]

Options:
  --coverage         Run tests with coverage reporting
  --api-only         Run only Pinterest API integration tests
  --workflow-only    Run only workflow integration tests
  --performance-only Run only performance benchmark tests
  --verbose          Enable verbose test output
  --help, -h         Show this help message

Environment Variables:
  PINTEREST_INTEGRATION_TESTS=true    Enable integration tests
  PINTEREST_CLIENT_ID                 Pinterest API client ID
  PINTEREST_CLIENT_SECRET             Pinterest API client secret
  PINTEREST_ACCESS_TOKEN              Pinterest API access token
  PINTEREST_REFRESH_TOKEN             Pinterest API refresh token (optional)
  PINTEREST_SANDBOX_MODE=true         Use Pinterest sandbox mode (optional)
  PINTEREST_CLEANUP_TEST_DATA=true    Clean up test data after tests (optional)

The script will automatically load environment variables from .env.integration
if the file exists.

Examples:
  node scripts/run-integration-tests.js --coverage
  node scripts/run-integration-tests.js --api-only --verbose
  node scripts/run-integration-tests.js --performance-only
`);
  process.exit(0);
}

// Run main function
main();
