# n8n-nodes-pinterest

A comprehensive Pinterest node for n8n that enables seamless integration with Pinterest API v5. This community node allows you to automate Pinterest workflows including pin management, board operations, media uploads, analytics access, and search functionality.

## Features

- **Complete Pinterest API Integration** - Full support for Pinterest API v5
- **OAuth 2.0 Authentication** - Secure authentication with continuous refresh tokens
- **Pin Management** - Create, read, update, and delete pins with media upload support
- **Board Operations** - Comprehensive board management including creation, updates, and organization
- **Media Upload** - Direct image and video upload to Pinterest (JPEG, PNG, GIF up to 10MB; MP4, MOV up to 100MB)
- **Analytics Access** - Retrieve performance data for pins, boards, and user accounts
- **Search & Discovery** - Search pins and boards, access trending content
- **Rate Limit Compliance** - Intelligent rate limiting to respect Pinterest's API limits (1000 requests/hour)
- **Robust Error Handling** - Comprehensive error handling with actionable user feedback
- **Security First** - Secure credential management and data protection

## Installation

### Prerequisites

- n8n version 0.190.0 or higher
- Node.js version 16.0.0 or higher
- A Pinterest Developer Account with API access

### Install via n8n Community Nodes

1. Open your n8n instance
2. Go to **Settings** → **Community Nodes**
3. Click **Install a community node**
4. Enter: `n8n-nodes-pinterest`
5. Click **Install**

### Manual Installation

```bash
# Navigate to your n8n installation directory
cd ~/.n8n

# Install the Pinterest node package
npm install n8n-nodes-pinterest

# Restart n8n
n8n start
```

### Docker Installation

Add the package to your n8n Docker container:

```dockerfile
FROM n8nio/n8n:latest

USER root
RUN npm install -g n8n-nodes-pinterest
USER node
```

Or use environment variables:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_CUSTOM_EXTENSIONS="n8n-nodes-pinterest" \
  n8nio/n8n
```

## Configuration

### Pinterest Developer Setup

1. **Create Pinterest App**
   - Go to [Pinterest Developers](https://developers.pinterest.com/)
   - Click "Create app" and fill in the required information
   - Note your **App ID** and **App Secret**

2. **Configure OAuth Settings**
   - Set redirect URI to: `{YOUR_N8N_URL}/rest/oauth2-credential/callback`
   - Example: `https://your-n8n.com/rest/oauth2-credential/callback`
   - Enable required scopes (automatically configured by the node)

### n8n Credential Setup

1. **Add Pinterest Credentials**
   - In n8n, go to **Credentials** → **Add Credential**
   - Search for "Pinterest OAuth2 API"
   - Enter your Pinterest **Client ID** and **Client Secret**
   - Ensure "Use Continuous Refresh" is enabled (recommended)
   - Click **Connect my account** and authorize with Pinterest

2. **Test Connection**
   - Click **Test** to verify the connection
   - You should see your Pinterest account information

## Quick Start

### Basic Pin Creation Workflow

```json
{
	"nodes": [
		{
			"parameters": {
				"resource": "pin",
				"operation": "create",
				"boardId": "your-board-id",
				"mediaSource": "url",
				"mediaUrl": "https://example.com/image.jpg",
				"title": "My Automated Pin",
				"description": "Created via n8n workflow"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [400, 300],
			"id": "pinterest-node",
			"name": "Pinterest"
		}
	]
}
```

### Board Management Example

```json
{
	"nodes": [
		{
			"parameters": {
				"resource": "board",
				"operation": "create",
				"name": "Automated Board",
				"description": "Board created via n8n",
				"privacy": "public"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [400, 300],
			"id": "pinterest-board",
			"name": "Create Board"
		}
	]
}
```

## Supported Operations

### Pin Operations

- **Create Pin** - Upload or link media to create new pins
- **Get Pin** - Retrieve pin details and metadata
- **Update Pin** - Modify pin title, description, board assignment
- **Delete Pin** - Remove pins from Pinterest
- **Get Pin Analytics** - Access performance metrics

### Board Operations

- **Create Board** - Create new boards with privacy settings
- **Get Board** - Retrieve board information and statistics
- **Update Board** - Modify board properties and settings
- **Delete Board** - Remove boards (handles pin dependencies)
- **Get Board Analytics** - Access board performance data

### User Operations

- **Get Profile** - Retrieve user account information
- **Get User Analytics** - Access account-level metrics

### Search Operations

- **Search Pins** - Find pins by keywords and filters
- **Search Boards** - Discover boards with metadata filtering

### Media Operations

- **Upload Media** - Direct file upload for images and videos

## Rate Limiting

The Pinterest node automatically handles Pinterest's API rate limits:

- **Limit**: 1000 requests per hour per user
- **Intelligent Queuing**: Requests are queued when approaching limits
- **Automatic Retry**: Failed requests are retried with exponential backoff
- **Progress Tracking**: Long-running operations show progress updates

## Error Handling

The node provides comprehensive error handling with specific guidance:

- **Authentication Errors**: Clear instructions for credential issues
- **Validation Errors**: Field-specific error messages with correction guidance
- **Rate Limit Errors**: Automatic handling with retry mechanisms
- **API Errors**: Detailed error classification and resolution steps

## Security & Privacy

- **Encrypted Credentials**: All tokens are encrypted using n8n's secure credential storage
- **HTTPS Only**: All API communications use TLS encryption
- **No Sensitive Logging**: Access tokens and personal data are never logged
- **GDPR Compliant**: Follows data protection regulations
- **Secure Token Refresh**: Automatic token refresh without exposing credentials

## Troubleshooting

### Common Issues

**Authentication Failed**

```
Error: Authentication failed: Please check your Pinterest credentials
```

- Verify Client ID and Client Secret are correct
- Ensure redirect URI matches your n8n instance URL
- Try reconnecting your Pinterest account

**Rate Limit Exceeded**

```
Error: Rate limit exceeded
```

- The node automatically handles this, but you can:
- Reduce workflow frequency
- Implement delays between operations
- Use batch operations when available

**Media Upload Failed**

```
Error: Media upload failed: Invalid file format
```

- Ensure file format is supported (JPEG, PNG, GIF for images; MP4, MOV for videos)
- Check file size limits (10MB for images, 100MB for videos)
- Verify file is not corrupted

### Getting Help

1. **Check the Documentation** - Review operation-specific guides
2. **Enable Debug Logging** - Set n8n log level to debug for detailed information
3. **Community Support** - Visit the n8n community forum
4. **GitHub Issues** - Report bugs or request features

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/n8n-nodes-pinterest.git
cd n8n-nodes-pinterest

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Link for local development
npm link
cd ~/.n8n
npm link n8n-nodes-pinterest
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## Support

- **Documentation**: [Full documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/n8n-nodes-pinterest/issues)
- **Community**: [n8n Community Forum](https://community.n8n.io/)
- **Email**: support@your-org.com

---

Made with ❤️ for the n8n community
