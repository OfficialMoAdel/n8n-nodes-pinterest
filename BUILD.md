# Build and Development Guide

This document provides comprehensive information about building, testing, and deploying the Pinterest n8n node.

## Prerequisites

- Node.js >= 18.10.0
- npm >= 8.0.0
- TypeScript knowledge for development

## Development Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start development mode:**
   ```bash
   npm run dev
   ```
   This starts TypeScript compilation in watch mode.

## Build Process

### Quick Build

```bash
npm run build
```

### Build Steps Explained

1. **Clean:** Removes previous build artifacts

   ```bash
   npm run clean
   ```

2. **Compile:** TypeScript compilation with production settings

   ```bash
   npm run compile
   ```

3. **Copy Assets:** Copies icons and other assets to dist
   ```bash
   npm run copy-assets
   ```

### Build Configuration

- **TypeScript Config:** `tsconfig.build.json` (production optimized)
- **Asset Copying:** `gulpfile.js` handles icons and static files
- **Output Directory:** `dist/`

## Code Quality

### Linting

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

### Formatting

```bash
npm run format        # Format code
npm run format:check  # Check formatting
```

### Type Checking

```bash
npm run type-check    # TypeScript type validation
```

### Comprehensive Validation

```bash
npm run validate      # Run all quality checks
```

## Testing

### Unit Tests

```bash
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

### Integration Tests

```bash
npm run test:integration  # Pinterest API integration tests
```

### Build Testing

```bash
npm run test:build        # Test build output
npm run test:package      # Test package integrity
npm run test:deployment   # Test installation process
```

### Complete Test Suite

```bash
npm run test:all          # All tests (unit + integration)
```

## Package Validation

### Build Validation

```bash
npm run validate:build
```

Runs comprehensive validation including:

- TypeScript compilation
- Linting and formatting
- Build process
- Package integrity
- Unit tests

### Package Structure Validation

The build process ensures the following structure:

```
dist/
├── nodes/
│   └── Pinterest/
│       ├── Pinterest.node.js
│       ├── Pinterest.node.d.ts
│       └── pinterest.svg
└── credentials/
    ├── PinterestOAuth2Api.credentials.js
    └── PinterestOAuth2Api.credentials.d.ts
```

## Publishing Preparation

### Pre-publish Checklist

1. **Update version:** Update `package.json` version
2. **Update changelog:** Document changes in `CHANGELOG.md`
3. **Run validation:** `npm run validate:build`
4. **Test deployment:** `npm run test:deployment`

### Publishing Process

```bash
npm publish
```

The `prepack` script automatically runs:

- Code validation
- Build process
- Deployment testing

### Pre-publish Validation

The `prepublishOnly` script runs:

- Complete test suite
- Strict linting with production rules

## Configuration Files

### TypeScript

- `tsconfig.json` - Development configuration
- `tsconfig.build.json` - Production build configuration

### ESLint

- `.eslintrc.js` - Development linting rules
- `.eslintrc.prepublish.js` - Strict production rules

### Prettier

- `.prettierrc.js` - Code formatting configuration

### Jest

- `jest.config.js` - Unit test configuration
- `jest.integration.config.js` - Integration test configuration

### Build Tools

- `gulpfile.js` - Asset copying and build tasks
- `package.json` - Build scripts and dependencies

## Build Scripts Reference

| Script             | Description              |
| ------------------ | ------------------------ |
| `build`            | Complete build process   |
| `clean`            | Remove build artifacts   |
| `compile`          | TypeScript compilation   |
| `copy-assets`      | Copy icons and assets    |
| `dev`              | Development watch mode   |
| `lint`             | Code linting             |
| `lint:fix`         | Auto-fix lint issues     |
| `format`           | Code formatting          |
| `format:check`     | Check code formatting    |
| `type-check`       | TypeScript validation    |
| `test`             | Unit tests               |
| `test:integration` | Integration tests        |
| `test:all`         | All tests                |
| `test:build`       | Build testing            |
| `test:package`     | Package integrity        |
| `test:deployment`  | Deployment testing       |
| `validate`         | Quality checks           |
| `validate:build`   | Comprehensive validation |
| `prepack`          | Pre-packaging validation |
| `prepublishOnly`   | Pre-publish validation   |

## Troubleshooting

### Common Build Issues

1. **TypeScript Errors:**
   - Run `npm run type-check` to see detailed errors
   - Check `tsconfig.build.json` for configuration issues

2. **Asset Copy Failures:**
   - Ensure icons exist in source directories
   - Check `gulpfile.js` for path configurations

3. **Package Validation Failures:**
   - Run `npm run test:package` for detailed diagnostics
   - Check `dist/` directory structure

4. **Linting Errors:**
   - Run `npm run lint:fix` for auto-fixes
   - Check `.eslintrc.js` for rule configurations

### Performance Optimization

- Use `npm run dev` for faster development builds
- Run `npm run validate:build` before commits
- Use `npm run test:watch` for continuous testing

## CI/CD Integration

The build process is designed to work with CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Build and Test
  run: |
    npm ci
    npm run validate:build
    npm run test:all
```

## Development Workflow

1. **Start development:** `npm run dev`
2. **Make changes:** Edit TypeScript files
3. **Test changes:** `npm run test:watch`
4. **Validate:** `npm run validate`
5. **Build:** `npm run build`
6. **Test build:** `npm run test:build`
7. **Commit changes**

## Production Deployment

1. **Final validation:** `npm run validate:build`
2. **Version bump:** Update `package.json`
3. **Update changelog:** Document changes
4. **Test deployment:** `npm run test:deployment`
5. **Publish:** `npm publish`

The build system ensures high code quality, comprehensive testing, and reliable deployment of the Pinterest n8n node.
