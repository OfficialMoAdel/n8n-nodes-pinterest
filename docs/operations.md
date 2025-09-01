# Pinterest Node Operations Guide

This guide provides detailed information about each operation supported by the Pinterest node, including parameters, examples, and best practices.

## Pin Operations

### Create Pin

Creates a new pin on Pinterest with media content.

#### Parameters

| Parameter     | Type   | Required    | Description                                               |
| ------------- | ------ | ----------- | --------------------------------------------------------- |
| `boardId`     | string | Yes         | ID of the board to add the pin to                         |
| `mediaSource` | select | Yes         | Source of media: "url" or "upload"                        |
| `mediaUrl`    | string | Conditional | URL of the image/video (required if mediaSource is "url") |
| `mediaFile`   | file   | Conditional | File to upload (required if mediaSource is "upload")      |
| `title`       | string | No          | Title of the pin (max 100 characters)                     |
| `description` | string | No          | Description of the pin (max 800 characters)               |
| `link`        | string | No          | Destination URL when pin is clicked                       |
| `altText`     | string | No          | Alt text for accessibility (max 500 characters)           |

#### Example: Create Pin from URL

```json
{
	"parameters": {
		"resource": "pin",
		"operation": "create",
		"boardId": "123456789012345678",
		"mediaSource": "url",
		"mediaUrl": "https://example.com/beautiful-image.jpg",
		"title": "Beautiful Landscape",
		"description": "A stunning landscape photo taken during golden hour",
		"link": "https://example.com/photography-blog",
		"altText": "Golden hour landscape with mountains and lake"
	}
}
```

#### Example: Create Pin with File Upload

```json
{
	"parameters": {
		"resource": "pin",
		"operation": "create",
		"boardId": "123456789012345678",
		"mediaSource": "upload",
		"mediaFile": "{{ $binary.data }}",
		"title": "Product Photo",
		"description": "New product launch - available now!"
	}
}
```

#### Response

```json
{
	"pinId": "987654321098765432",
	"url": "https://pinterest.com/pin/987654321098765432/",
	"title": "Beautiful Landscape",
	"description": "A stunning landscape photo taken during golden hour",
	"link": "https://example.com/photography-blog",
	"boardId": "123456789012345678",
	"createdAt": "2024-01-15T10:30:00Z",
	"mediaUrl": "https://i.pinimg.com/564x/abc/def/ghi.jpg",
	"mediaType": "image"
}
```

### Get Pin

Retrieves details of an existing pin.

#### Parameters

| Parameter          | Type    | Required | Description                             |
| ------------------ | ------- | -------- | --------------------------------------- |
| `pinId`            | string  | Yes      | ID of the pin to retrieve               |
| `includeAnalytics` | boolean | No       | Include analytics data (default: false) |

#### Example

```json
{
	"parameters": {
		"resource": "pin",
		"operation": "get",
		"pinId": "987654321098765432",
		"includeAnalytics": true
	}
}
```

### Update Pin

Updates an existing pin's properties.

#### Parameters

| Parameter     | Type   | Required | Description                    |
| ------------- | ------ | -------- | ------------------------------ |
| `pinId`       | string | Yes      | ID of the pin to update        |
| `title`       | string | No       | New title for the pin          |
| `description` | string | No       | New description for the pin    |
| `link`        | string | No       | New destination URL            |
| `boardId`     | string | No       | Move pin to different board    |
| `altText`     | string | No       | New alt text for accessibility |

#### Example

```json
{
	"parameters": {
		"resource": "pin",
		"operation": "update",
		"pinId": "987654321098765432",
		"title": "Updated Pin Title",
		"description": "Updated description with more details",
		"boardId": "111222333444555666"
	}
}
```

### Delete Pin

Permanently removes a pin from Pinterest.

#### Parameters

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `pinId`   | string | Yes      | ID of the pin to delete |

#### Example

```json
{
	"parameters": {
		"resource": "pin",
		"operation": "delete",
		"pinId": "987654321098765432"
	}
}
```

## Board Operations

### Create Board

Creates a new board on Pinterest.

#### Parameters

| Parameter     | Type   | Required | Description                                         |
| ------------- | ------ | -------- | --------------------------------------------------- |
| `name`        | string | Yes      | Name of the board (max 180 characters)              |
| `description` | string | No       | Description of the board (max 500 characters)       |
| `privacy`     | select | Yes      | Privacy setting: "public", "protected", or "secret" |

#### Example

```json
{
	"parameters": {
		"resource": "board",
		"operation": "create",
		"name": "Travel Inspiration",
		"description": "Beautiful destinations around the world",
		"privacy": "public"
	}
}
```

#### Response

```json
{
	"boardId": "123456789012345678",
	"name": "Travel Inspiration",
	"description": "Beautiful destinations around the world",
	"url": "https://pinterest.com/username/travel-inspiration/",
	"privacy": "public",
	"pinCount": 0,
	"followerCount": 0,
	"createdAt": "2024-01-15T10:30:00Z"
}
```

### Get Board

Retrieves details of an existing board.

#### Parameters

| Parameter          | Type    | Required | Description                             |
| ------------------ | ------- | -------- | --------------------------------------- |
| `boardId`          | string  | Yes      | ID of the board to retrieve             |
| `includeAnalytics` | boolean | No       | Include analytics data (default: false) |

#### Example

```json
{
	"parameters": {
		"resource": "board",
		"operation": "get",
		"boardId": "123456789012345678",
		"includeAnalytics": true
	}
}
```

### Update Board

Updates an existing board's properties.

#### Parameters

| Parameter     | Type   | Required | Description                   |
| ------------- | ------ | -------- | ----------------------------- |
| `boardId`     | string | Yes      | ID of the board to update     |
| `name`        | string | No       | New name for the board        |
| `description` | string | No       | New description for the board |
| `privacy`     | select | No       | New privacy setting           |

#### Example

```json
{
	"parameters": {
		"resource": "board",
		"operation": "update",
		"boardId": "123456789012345678",
		"name": "Updated Board Name",
		"description": "Updated board description"
	}
}
```

### Delete Board

Permanently removes a board from Pinterest.

#### Parameters

| Parameter | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| `boardId` | string | Yes      | ID of the board to delete |

#### Example

```json
{
	"parameters": {
		"resource": "board",
		"operation": "delete",
		"boardId": "123456789012345678"
	}
}
```

## User Operations

### Get Profile

Retrieves the authenticated user's profile information.

#### Parameters

No additional parameters required.

#### Example

```json
{
	"parameters": {
		"resource": "user",
		"operation": "getProfile"
	}
}
```

#### Response

```json
{
	"userId": "user123456789",
	"username": "myusername",
	"displayName": "My Display Name",
	"firstName": "John",
	"lastName": "Doe",
	"bio": "Content creator and Pinterest enthusiast",
	"avatarUrl": "https://i.pinimg.com/avatars/user123456789.jpg",
	"accountType": "business"
}
```

### Get User Analytics

Retrieves analytics data for the authenticated user's account.

#### Parameters

| Parameter     | Type        | Required | Description                     |
| ------------- | ----------- | -------- | ------------------------------- |
| `startDate`   | string      | Yes      | Start date in YYYY-MM-DD format |
| `endDate`     | string      | Yes      | End date in YYYY-MM-DD format   |
| `metricTypes` | multiselect | No       | Specific metrics to retrieve    |

#### Example

```json
{
	"parameters": {
		"resource": "user",
		"operation": "getAnalytics",
		"startDate": "2024-01-01",
		"endDate": "2024-01-31",
		"metricTypes": ["IMPRESSION", "SAVE", "PIN_CLICK"]
	}
}
```

## Search Operations

### Search Pins

Searches for pins based on keywords and filters.

#### Parameters

| Parameter  | Type   | Required | Description                                       |
| ---------- | ------ | -------- | ------------------------------------------------- |
| `query`    | string | Yes      | Search keywords                                   |
| `limit`    | number | No       | Number of results to return (max 250, default 25) |
| `bookmark` | string | No       | Pagination token for next page                    |

#### Example

```json
{
	"parameters": {
		"resource": "search",
		"operation": "pins",
		"query": "travel photography",
		"limit": 50
	}
}
```

#### Response

```json
{
	"items": [
		{
			"pinId": "pin123",
			"title": "Beautiful Travel Photo",
			"description": "Amazing landscape from my recent trip",
			"url": "https://pinterest.com/pin/pin123/",
			"mediaUrl": "https://i.pinimg.com/564x/abc/def/ghi.jpg"
		}
	],
	"bookmark": "next_page_token_here"
}
```

### Search Boards

Searches for boards based on keywords and filters.

#### Parameters

| Parameter  | Type   | Required | Description                                       |
| ---------- | ------ | -------- | ------------------------------------------------- |
| `query`    | string | Yes      | Search keywords                                   |
| `limit`    | number | No       | Number of results to return (max 250, default 25) |
| `bookmark` | string | No       | Pagination token for next page                    |

#### Example

```json
{
	"parameters": {
		"resource": "search",
		"operation": "boards",
		"query": "home decor",
		"limit": 25
	}
}
```

## Media Operations

### Upload Media

Uploads media files directly to Pinterest for use in pin creation.

#### Parameters

| Parameter   | Type   | Required | Description                       |
| ----------- | ------ | -------- | --------------------------------- |
| `mediaType` | select | Yes      | Type of media: "image" or "video" |
| `file`      | file   | Yes      | Media file to upload              |

#### Supported Formats

**Images:**

- JPEG, PNG, GIF
- Maximum size: 10MB
- Recommended dimensions: 1000x1500px (2:3 aspect ratio)

**Videos:**

- MP4, MOV
- Maximum size: 100MB
- Maximum duration: 15 minutes
- Recommended dimensions: 1080x1920px (9:16 aspect ratio)

#### Example

```json
{
	"parameters": {
		"resource": "media",
		"operation": "upload",
		"mediaType": "image",
		"file": "{{ $binary.data }}"
	}
}
```

#### Response

```json
{
	"mediaId": "media_abc123def456",
	"url": "https://i.pinimg.com/originals/abc/def/ghi.jpg",
	"mediaType": "image",
	"uploadedAt": "2024-01-15T10:30:00Z"
}
```

## Best Practices

### Rate Limiting

- The node automatically handles Pinterest's 1000 requests/hour limit
- For high-volume operations, consider implementing delays between requests
- Use batch operations when available to minimize API calls

### Error Handling

- Always check for errors in your workflow logic
- Implement retry mechanisms for transient failures
- Use the node's built-in error classification for appropriate responses

### Media Optimization

- Optimize images for Pinterest's recommended 2:3 aspect ratio
- Use high-quality images (at least 600px wide)
- Compress files to stay within size limits while maintaining quality

### Security

- Never expose Pinterest credentials in workflow configurations
- Use n8n's secure credential storage
- Regularly rotate API credentials for enhanced security

### Performance

- Use pagination for large search results
- Implement caching for frequently accessed data
- Monitor API usage to stay within rate limits
