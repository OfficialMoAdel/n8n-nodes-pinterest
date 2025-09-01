# Pinterest Node for n8n

This directory contains the Pinterest node implementation for n8n workflow automation.

## Project Structure

```
nodes/Pinterest/
├── Pinterest.node.ts          # Main node implementation
├── pinterest.svg              # Pinterest icon
├── operations/                # Operation handlers (to be implemented)
│   ├── pin/                  # Pin operations
│   ├── board/                # Board operations
│   ├── user/                 # User operations
│   └── search/               # Search operations
└── utils/                    # Utility classes
    ├── types.ts              # TypeScript type definitions
    ├── PinterestApiClient.ts # Pinterest API client (placeholder)
    ├── RateLimiter.ts        # Rate limiting (placeholder)
    ├── ErrorHandler.ts       # Error handling (placeholder)
    └── DataTransformer.ts    # Data transformation (placeholder)
```

## Current Status

✅ **Task 1 Complete**: Project structure and core interfaces have been set up.

The following components have been created:

- Pinterest OAuth 2.0 credentials configuration
- Main Pinterest node with basic structure
- Core TypeScript interfaces and types for Pinterest API
- Placeholder utility classes for future implementation
- Operation handler structure for pins, boards, users, and search
- Build configuration and linting setup

## Next Steps

The following tasks are ready for implementation:

- Task 2: Implement Pinterest OAuth 2.0 credentials
- Task 3: Create Pinterest API client foundation
- Task 4: Implement rate limiting system
- Task 5: Build comprehensive error handling

## Build and Development

```bash
# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

All placeholder implementations throw errors with descriptive messages indicating which task will implement the functionality.
