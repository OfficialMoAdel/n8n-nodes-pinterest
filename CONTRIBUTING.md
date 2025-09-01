# Contributing to n8n-nodes-pinterest

We welcome contributions to the Pinterest node for n8n! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- npm 7.0.0 or higher
- Git
- n8n development environment
- Pinterest Developer Account (for testing)

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/n8n-nodes-pinterest.git
   cd n8n-nodes-pinterest
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Project**

   ```bash
   npm run build
   ```

4. **Link for Local Development**

   ```bash
   npm link
   cd ~/.n8n
   npm link n8n-nodes-pinterest
   ```

5. **Start n8n in Development Mode**
   ```bash
   n8n start --tunnel
   ```

## Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

- **Bug Fixes** - Fix issues in existing functionality
- **New Features** - Add new Pinterest operations or capabilities
- **Documentation** - Improve or add documentation
- **Tests** - Add or improve test coverage
- **Performance** - Optimize existing code
- **Security** - Address security vulnerabilities

### Before You Start

1. **Check Existing Issues** - Look for existing issues or feature requests
2. **Create an Issue** - For new features or significant changes, create an issue first
3. **Discuss Approach** - Get feedback on your proposed approach
4. **Follow Standards** - Ensure your contribution follows project standards

### Code Style

We follow strict code style guidelines:

#### TypeScript Standards

```typescript
// Use explicit types
interface PinData {
  id: string;
  title: string;
  description?: string;
}

// Prefer const over let
const apiClient = new PinterestApiClient();

// Use meaningful names
const createPinResponse = await apiClient.createPin(pinData);

// Add JSDoc comments for public methods
/**
 * Creates a new pin on Pinterest
 * @param pinData - The pin data to create
 * @returns Promise resolving to the created pin
 */
async createPin(pinData: CreatePinRequest): Promise<PinResponse> {
  // Implementation
}
```

#### Formatting Rules

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multiline objects/arrays
- Maximum line length: 100 characters
- Use semicolons

#### Linting and Formatting

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format
```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

#### Examples

```
feat: add pin analytics operation
fix: handle rate limit errors correctly
docs: update API client documentation
test: add unit tests for board operations
refactor: improve error handling structure
```

### Branch Naming

Use descriptive branch names:

```
feature/pin-analytics
fix/rate-limit-handling
docs/api-documentation
test/board-operations
```

## Pull Request Process

### 1. Prepare Your Changes

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**

   ```bash
   npm test
   npm run test:integration
   npm run lint
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new Pinterest operation"
   ```

### 2. Submit Pull Request

1. **Push to Your Fork**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Use descriptive title and description
   - Reference related issues
   - Include testing instructions
   - Add screenshots for UI changes

3. **Pull Request Template**

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Performance improvement

   ## Testing

   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist

   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] Tests added/updated
   ```

### 3. Review Process

1. **Automated Checks** - CI/CD pipeline runs automatically
2. **Code Review** - Maintainers review your code
3. **Address Feedback** - Make requested changes
4. **Approval** - Get approval from maintainers
5. **Merge** - Changes are merged to main branch

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**

1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What you expected to happen

**Actual Behavior**
What actually happened

**Environment**

- n8n version:
- Pinterest node version:
- OS:
- Browser (if applicable):

**Additional Context**
Any other context about the problem
```

### Feature Requests

Use the feature request template:

```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Any other context or screenshots
```

## Development Workflow

### Adding New Operations

1. **Define Operation** in `PinterestDescription.ts`
2. **Create Operation Handler** in appropriate operations folder
3. **Add API Client Method** if needed
4. **Update Main Node** to route to new operation
5. **Add Tests** for the new operation
6. **Update Documentation**

### Example: Adding Pin Analytics

1. **Add to Description**

   ```typescript
   {
     name: 'Get Analytics',
     value: 'getAnalytics',
     description: 'Get analytics data for a pin',
     action: 'Get pin analytics',
   }
   ```

2. **Create Handler**

   ```typescript
   // operations/pin/getAnalytics.operation.ts
   export async function getPinAnalytics(
   	this: IExecuteFunctions,
   	apiClient: PinterestApiClient,
   	itemIndex: number,
   ): Promise<INodeExecutionData> {
   	// Implementation
   }
   ```

3. **Add API Method**

   ```typescript
   // utils/PinterestApiClient.ts
   async getPinAnalytics(pinId: string, params: AnalyticsParams): Promise<AnalyticsResponse> {
     // Implementation
   }
   ```

4. **Update Router**
   ```typescript
   case 'getAnalytics':
     return getPinAnalytics.call(this, apiClient, itemIndex);
   ```

### Testing New Features

1. **Unit Tests**

   ```bash
   npm run test:unit
   ```

2. **Integration Tests**

   ```bash
   npm run test:integration
   ```

3. **Manual Testing**
   - Test in n8n interface
   - Verify all parameters work
   - Test error scenarios
   - Check data transformation

## Testing

### Test Structure

```
__tests__/
├── unit/
│   ├── operations/
│   │   ├── pin/
│   │   └── board/
│   ├── utils/
│   └── credentials/
├── integration/
│   ├── pinterest.integration.test.ts
│   └── workflows/
└── fixtures/
    ├── api-responses/
    └── test-data/
```

### Writing Tests

#### Unit Tests

```typescript
describe('Pin Create Operation', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	let mockApiClient: PinterestApiClient;

	beforeEach(() => {
		mockExecuteFunctions = createMockExecuteFunctions();
		mockApiClient = createMockApiClient();
	});

	it('should create pin with valid data', async () => {
		// Arrange
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('board123')
			.mockReturnValueOnce('url')
			.mockReturnValueOnce('https://example.com/image.jpg');

		mockApiClient.createPin.mockResolvedValue({
			id: 'pin123',
			url: 'https://pinterest.com/pin/pin123/',
		});

		// Act
		const result = await createPin.call(mockExecuteFunctions, mockApiClient, 0);

		// Assert
		expect(result.json).toEqual({
			pinId: 'pin123',
			url: 'https://pinterest.com/pin/pin123/',
		});
	});
});
```

#### Integration Tests

```typescript
describe('Pinterest Integration', () => {
	let apiClient: PinterestApiClient;

	beforeAll(async () => {
		const credentials = await loadTestCredentials();
		apiClient = new PinterestApiClient(credentials, mockHelpers);
	});

	it('should create and retrieve pin', async () => {
		// Create pin
		const createResponse = await apiClient.createPin({
			board_id: TEST_BOARD_ID,
			media_source: {
				source_type: 'image_url',
				url: 'https://example.com/test.jpg',
			},
		});

		expect(createResponse.id).toBeDefined();

		// Retrieve pin
		const getResponse = await apiClient.getPin(createResponse.id);
		expect(getResponse.id).toBe(createResponse.id);

		// Cleanup
		await apiClient.deletePin(createResponse.id);
	});
});
```

### Test Configuration

Create `.env.test` file for test configuration:

```env
PINTEREST_CLIENT_ID=test_client_id
PINTEREST_CLIENT_SECRET=test_client_secret
PINTEREST_ACCESS_TOKEN=test_access_token
TEST_BOARD_ID=test_board_id
```

## Documentation

### Types of Documentation

1. **Code Documentation** - JSDoc comments in code
2. **API Documentation** - Operation guides and examples
3. **User Documentation** - User guide and tutorials
4. **Developer Documentation** - This contributing guide

### Documentation Standards

- Use clear, concise language
- Include practical examples
- Keep documentation up-to-date with code changes
- Use proper markdown formatting
- Include screenshots for UI elements

### Updating Documentation

When making changes:

1. **Update JSDoc Comments** for modified functions
2. **Update Operation Docs** for new/changed operations
3. **Update User Guide** for new features
4. **Update README** if needed
5. **Update CHANGELOG** for releases

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality
- **PATCH** version for backwards-compatible bug fixes

### Release Steps

1. **Update Version**

   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG.md**
   - Add new version section
   - List all changes since last release
   - Include breaking changes

3. **Create Release PR**
   - Update documentation
   - Final testing
   - Get approval

4. **Tag and Release**

   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

5. **Publish to npm**
   ```bash
   npm publish
   ```

## Getting Help

### Community Resources

- **GitHub Discussions** - For questions and discussions
- **Issues** - For bug reports and feature requests
- **n8n Community** - For general n8n questions

### Maintainer Contact

- **GitHub Issues** - Primary communication method
- **Email** - For security issues: security@your-org.com

### Response Times

- **Bug Reports** - Within 48 hours
- **Feature Requests** - Within 1 week
- **Pull Requests** - Within 1 week
- **Security Issues** - Within 24 hours

## Recognition

Contributors are recognized in:

- **CONTRIBUTORS.md** file
- **Release notes** for significant contributions
- **GitHub contributors** section

Thank you for contributing to the Pinterest node for n8n! Your contributions help make automation more accessible to everyone.
