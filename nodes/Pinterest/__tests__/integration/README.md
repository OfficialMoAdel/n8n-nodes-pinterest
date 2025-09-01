# Pinterest Node Integration Tests

This directory contains comprehensive integration tests for the Pinterest node, including real Pinterest API interactions, end-to-end workflow testing, and performance benchmarking.

## Test Structure

- `config.ts` - Integration test configuration and environment setup
- `TestDataManager.ts` - Manages test data creation and cleanup
- `PerformanceBenchmark.ts` - Performance monitoring and validation utilities
- `setup.ts` - Global test setup and teardown utilities
- `pinterest-api.integration.test.ts` - Pinterest API integration tests
- `workflow.integration.test.ts` - End-to-end workflow tests
- `performance.integration.test.ts` - Performance benchmark tests

## Environment Setup

### Required Environment Variables

```bash
# Enable integration tests
PINTEREST_INTEGRATION_TESTS=true

# Pinterest API credentials
PINTEREST_CLIENT_ID=your_client_id
PINTEREST_CLIENT_SECRET=your_client_secret
PINTEREST_ACCESS_TOKEN=your_access_token
PINTEREST_REFRESH_TOKEN=your_refresh_token  # Optional

# Optional configuration
PINTEREST_API_BASE_URL=https://api.pinterest.com/v5  # Default
PINTEREST_SANDBOX_MODE=true  # Use sandbox if available
PINTEREST_TEST_ACCOUNT_ID=your_test_account_id  # Optional
PINTEREST_CLEANUP_TEST_DATA=true  # Default: true
PINTEREST_PRESERVE_TEST_BOARDS=false  # Default: false
```

### Pinterest Developer Account Setup

1. Create a Pinterest Developer account at https://developers.pinterest.com/
2. Create a new app and obtain your Client ID and Client Secret
3. Generate an access token with the following scopes:
   - `user_accounts:read`
   - `boards:read`, `boards:write`, `boards:read_secret`, `boards:write_secret`
   - `pins:read`, `pins:write`, `pins:read_secret`, `pins:write_secret`
4. For production testing, ensure your app is approved for the required scopes

### Test Account Recommendations

- Use a dedicated test Pinterest account
- Create test boards that can be safely modified/deleted
- Avoid using personal or production Pinterest accounts
- Consider using Pinterest's sandbox environment if available

## Running Integration Tests

### Run All Integration Tests

```bash
npm run test -- --testPathPattern=integration
```

### Run Specific Test Suites

```bash
# Pinterest API tests only
npm run test -- nodes/Pinterest/__tests__/integration/pinterest-api.integration.test.ts

# Workflow tests only
npm run test -- nodes/Pinterest/__tests__/integration/workflow.integration.test.ts

# Performance tests only
npm run test -- nodes/Pinterest/__tests__/integration/performance.integration.test.ts
```

### Run with Coverage

```bash
npm run test:coverage -- --testPathPattern=integration
```

## Test Categories

### 1. Pinterest API Integration Tests (`pinterest-api.integration.test.ts`)

Tests direct Pinterest API interactions:

- Authentication and token management
- Pin CRUD operations
- Board management
- User profile and analytics
- Search functionality
- Rate limiting compliance

### 2. End-to-End Workflow Tests (`workflow.integration.test.ts`)

Tests complete n8n workflows:

- Pin lifecycle workflows (create → get → update → delete)
- Board management workflows
- Batch operations
- Search and analytics workflows
- Error handling scenarios

### 3. Performance Benchmark Tests (`performance.integration.test.ts`)

Tests performance requirements:

- Single operation response times
- Concurrent request handling
- Batch operation efficiency
- Rate limiting performance
- Memory usage stability

## Performance Requirements

The integration tests validate the following performance requirements:

- **Response Time**: Average < 5 seconds, P95 < 7.5 seconds
- **Success Rate**: > 95% for all operations
- **Concurrent Requests**: Handle 5 concurrent requests efficiently
- **Batch Operations**: Process up to 25 items per batch
- **Memory Usage**: Stable memory usage during extended operations

## Test Data Management

### Automatic Cleanup

- Test data is automatically created before tests run
- All created resources are tracked and cleaned up after tests
- Cleanup can be disabled with `PINTEREST_CLEANUP_TEST_DATA=false`

### Test Data Prefix

All test resources are created with the prefix `n8n-test-` to:

- Easily identify test data
- Avoid conflicts with real data
- Enable safe cleanup operations

### Preservation Options

- Set `PINTEREST_PRESERVE_TEST_BOARDS=true` to keep test boards after cleanup
- Useful for debugging or manual verification

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Pinterest credentials are correct
   - Check token expiration and refresh token availability
   - Ensure required scopes are granted

2. **Rate Limiting**
   - Tests include rate limiting handling
   - Reduce concurrent requests if hitting limits frequently
   - Consider using test delays between operations

3. **Test Data Conflicts**
   - Ensure test account has sufficient permissions
   - Check for existing resources with conflicting names
   - Verify cleanup is working properly

4. **Network Issues**
   - Tests include retry logic for transient failures
   - Check Pinterest API status if tests consistently fail
   - Verify network connectivity and firewall settings

### Debug Mode

Enable verbose logging by setting:

```bash
DEBUG=pinterest:*
```

### Performance Issues

If performance tests fail:

1. Check network latency to Pinterest API
2. Verify test environment resources
3. Review Pinterest API status and performance
4. Adjust performance thresholds in `config.ts` if needed

## Contributing

When adding new integration tests:

1. Follow the existing test structure and patterns
2. Use the `TestDataManager` for resource management
3. Include performance monitoring with `PerformanceBenchmark`
4. Add proper cleanup for any created resources
5. Update this README with new test descriptions

## Security Notes

- Never commit Pinterest credentials to version control
- Use environment variables for all sensitive configuration
- Regularly rotate test account credentials
- Monitor test account for unexpected activity
