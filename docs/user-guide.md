# Pinterest Node User Guide

This comprehensive guide helps you get the most out of the Pinterest node for n8n, with practical workflow examples, best practices, and advanced use cases.

## Getting Started

### Prerequisites

Before using the Pinterest node, ensure you have:

1. **n8n Instance** - Version 0.190.0 or higher
2. **Pinterest Developer Account** - Sign up at [Pinterest Developers](https://developers.pinterest.com/)
3. **Pinterest App** - Created in your developer account
4. **API Credentials** - Client ID and Client Secret from your Pinterest app

### Quick Setup

1. **Install the Pinterest Node**
   - Go to n8n Settings → Community Nodes
   - Install `n8n-nodes-pinterest`

2. **Configure Credentials**
   - Add Pinterest OAuth2 API credentials
   - Enter your Client ID and Client Secret
   - Connect your Pinterest account

3. **Test Connection**
   - Use the credential test feature
   - Verify you can access your Pinterest data

## Basic Workflows

### 1. Simple Pin Creation

Create pins from URLs or uploaded images.

```json
{
	"name": "Create Pinterest Pin",
	"nodes": [
		{
			"parameters": {
				"resource": "pin",
				"operation": "create",
				"boardId": "123456789012345678",
				"mediaSource": "url",
				"mediaUrl": "https://example.com/beautiful-image.jpg",
				"title": "Beautiful Landscape",
				"description": "A stunning view from my recent travels #travel #landscape",
				"link": "https://example.com/blog-post"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [400, 300],
			"id": "pinterest-create-pin",
			"name": "Create Pin"
		}
	],
	"connections": {}
}
```

**Use Cases:**

- Share blog post images
- Promote products
- Create visual content from RSS feeds

### 2. Board Management

Organize your Pinterest content with automated board creation and management.

```json
{
	"name": "Pinterest Board Management",
	"nodes": [
		{
			"parameters": {
				"resource": "board",
				"operation": "create",
				"name": "{{ $json.category }} - {{ $now.format('YYYY-MM') }}",
				"description": "Curated content for {{ $json.category }}",
				"privacy": "public"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [400, 200],
			"id": "create-board",
			"name": "Create Monthly Board"
		},
		{
			"parameters": {
				"resource": "pin",
				"operation": "create",
				"boardId": "{{ $node['Create Monthly Board'].json.boardId }}",
				"mediaSource": "url",
				"mediaUrl": "{{ $json.imageUrl }}",
				"title": "{{ $json.title }}",
				"description": "{{ $json.description }}"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [600, 200],
			"id": "add-pins",
			"name": "Add Pins to Board"
		}
	],
	"connections": {
		"Create Monthly Board": {
			"main": [
				[
					{
						"node": "Add Pins to Board",
						"type": "main",
						"index": 0
					}
				]
			]
		}
	}
}
```

**Use Cases:**

- Monthly content organization
- Campaign-specific boards
- Seasonal content curation

### 3. Content Analytics Dashboard

Monitor your Pinterest performance with automated analytics collection.

```json
{
	"name": "Pinterest Analytics Collection",
	"nodes": [
		{
			"parameters": {
				"resource": "user",
				"operation": "getProfile"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [200, 300],
			"id": "get-profile",
			"name": "Get Profile"
		},
		{
			"parameters": {
				"resource": "user",
				"operation": "getAnalytics",
				"startDate": "{{ $now.minus({days: 30}).toISODate() }}",
				"endDate": "{{ $now.toISODate() }}",
				"metricTypes": ["IMPRESSION", "SAVE", "PIN_CLICK"]
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [400, 300],
			"id": "get-analytics",
			"name": "Get Analytics"
		},
		{
			"parameters": {
				"operation": "create",
				"resource": "item",
				"options": {}
			},
			"type": "n8n-nodes-base.googleSheets",
			"typeVersion": 4,
			"position": [600, 300],
			"id": "save-to-sheets",
			"name": "Save to Google Sheets"
		}
	],
	"connections": {
		"Get Profile": {
			"main": [
				[
					{
						"node": "Get Analytics",
						"type": "main",
						"index": 0
					}
				]
			]
		},
		"Get Analytics": {
			"main": [
				[
					{
						"node": "Save to Google Sheets",
						"type": "main",
						"index": 0
					}
				]
			]
		}
	}
}
```

**Use Cases:**

- Performance tracking
- ROI measurement
- Content strategy optimization

## Advanced Workflows

### 1. E-commerce Product Automation

Automatically create pins for new products from your e-commerce platform.

```json
{
	"name": "E-commerce Pinterest Automation",
	"nodes": [
		{
			"parameters": {
				"pollTimes": {
					"item": [
						{
							"mode": "everyMinute"
						}
					]
				},
				"triggerOn": "specificFolder",
				"path": "/product-images"
			},
			"type": "n8n-nodes-base.folderTrigger",
			"typeVersion": 1,
			"position": [200, 300],
			"id": "folder-trigger",
			"name": "New Product Images"
		},
		{
			"parameters": {
				"url": "https://api.yourstore.com/products/{{ $json.name.replace('.jpg', '') }}",
				"authentication": "genericCredentialType",
				"genericAuthType": "httpHeaderAuth",
				"options": {}
			},
			"type": "n8n-nodes-base.httpRequest",
			"typeVersion": 4,
			"position": [400, 300],
			"id": "get-product-data",
			"name": "Get Product Data"
		},
		{
			"parameters": {
				"resource": "media",
				"operation": "upload",
				"mediaType": "image",
				"file": "{{ $node['New Product Images'].binary.data }}"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [600, 300],
			"id": "upload-image",
			"name": "Upload Product Image"
		},
		{
			"parameters": {
				"resource": "pin",
				"operation": "create",
				"boardId": "{{ $node['Get Product Data'].json.category_board_id }}",
				"mediaSource": "upload",
				"mediaId": "{{ $node['Upload Product Image'].json.mediaId }}",
				"title": "{{ $node['Get Product Data'].json.name }}",
				"description": "{{ $node['Get Product Data'].json.description }} #{{ $node['Get Product Data'].json.category }} #newproduct",
				"link": "{{ $node['Get Product Data'].json.product_url }}"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [800, 300],
			"id": "create-product-pin",
			"name": "Create Product Pin"
		}
	],
	"connections": {
		"New Product Images": {
			"main": [
				[
					{
						"node": "Get Product Data",
						"type": "main",
						"index": 0
					}
				]
			]
		},
		"Get Product Data": {
			"main": [
				[
					{
						"node": "Upload Product Image",
						"type": "main",
						"index": 0
					}
				]
			]
		},
		"Upload Product Image": {
			"main": [
				[
					{
						"node": "Create Product Pin",
						"type": "main",
						"index": 0
					}
				]
			]
		}
	}
}
```

### 2. Content Curation from RSS Feeds

Automatically curate and pin content from your favorite RSS feeds.

```json
{
	"name": "RSS to Pinterest Curation",
	"nodes": [
		{
			"parameters": {
				"feedUrl": "https://example.com/blog/feed.xml",
				"pollTimes": {
					"item": [
						{
							"mode": "everyHour"
						}
					]
				}
			},
			"type": "n8n-nodes-base.rssFeedRead",
			"typeVersion": 1,
			"position": [200, 300],
			"id": "rss-feed",
			"name": "RSS Feed Reader"
		},
		{
			"parameters": {
				"conditions": {
					"options": {
						"caseSensitive": true,
						"leftValue": "",
						"typeValidation": "strict"
					},
					"conditions": [
						{
							"id": "filter-new",
							"leftValue": "{{ $json.pubDate }}",
							"rightValue": "{{ $now.minus({hours: 2}).toISO() }}",
							"operator": {
								"type": "dateTime",
								"operation": "after"
							}
						}
					],
					"combinator": "and"
				},
				"options": {}
			},
			"type": "n8n-nodes-base.filter",
			"typeVersion": 2,
			"position": [400, 300],
			"id": "filter-recent",
			"name": "Filter Recent Posts"
		},
		{
			"parameters": {
				"url": "{{ $json.link }}",
				"options": {
					"response": {
						"response": {
							"neverError": true
						}
					}
				}
			},
			"type": "n8n-nodes-base.httpRequest",
			"typeVersion": 4,
			"position": [600, 300],
			"id": "extract-image",
			"name": "Extract Featured Image"
		},
		{
			"parameters": {
				"resource": "pin",
				"operation": "create",
				"boardId": "987654321098765432",
				"mediaSource": "url",
				"mediaUrl": "{{ $json.featured_image }}",
				"title": "{{ $node['RSS Feed Reader'].json.title }}",
				"description": "{{ $node['RSS Feed Reader'].json.contentSnippet.substring(0, 400) }}... Read more at {{ $node['RSS Feed Reader'].json.link }}",
				"link": "{{ $node['RSS Feed Reader'].json.link }}"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [800, 300],
			"id": "create-curated-pin",
			"name": "Create Curated Pin"
		}
	],
	"connections": {
		"RSS Feed Reader": {
			"main": [
				[
					{
						"node": "Filter Recent Posts",
						"type": "main",
						"index": 0
					}
				]
			]
		},
		"Filter Recent Posts": {
			"main": [
				[
					{
						"node": "Extract Featured Image",
						"type": "main",
						"index": 0
					}
				]
			]
		},
		"Extract Featured Image": {
			"main": [
				[
					{
						"node": "Create Curated Pin",
						"type": "main",
						"index": 0
					}
				]
			]
		}
	}
}
```

### 3. Social Media Cross-Posting

Share content across multiple social platforms including Pinterest.

```json
{
	"name": "Multi-Platform Content Sharing",
	"nodes": [
		{
			"parameters": {
				"pollTimes": {
					"item": [
						{
							"mode": "everyMinute"
						}
					]
				},
				"event": "fileAdded",
				"path": "/content-queue"
			},
			"type": "n8n-nodes-base.folderTrigger",
			"typeVersion": 1,
			"position": [200, 300],
			"id": "content-trigger",
			"name": "New Content"
		},
		{
			"parameters": {
				"operation": "read",
				"filePath": "{{ $json.path }}/metadata.json"
			},
			"type": "n8n-nodes-base.readWriteFile",
			"typeVersion": 1,
			"position": [400, 300],
			"id": "read-metadata",
			"name": "Read Content Metadata"
		},
		{
			"parameters": {
				"resource": "pin",
				"operation": "create",
				"boardId": "{{ $json.pinterest_board_id }}",
				"mediaSource": "upload",
				"mediaFile": "{{ $node['New Content'].binary.data }}",
				"title": "{{ $json.title }}",
				"description": "{{ $json.description }} {{ $json.hashtags }}",
				"link": "{{ $json.website_url }}"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"typeVersion": 1,
			"position": [600, 200],
			"id": "post-to-pinterest",
			"name": "Post to Pinterest"
		},
		{
			"parameters": {
				"resource": "tweet",
				"operation": "create",
				"text": "{{ $json.title }} {{ $json.website_url }} {{ $json.hashtags }}"
			},
			"type": "n8n-nodes-base.twitter",
			"typeVersion": 1,
			"position": [600, 400],
			"id": "post-to-twitter",
			"name": "Post to Twitter"
		}
	],
	"connections": {
		"New Content": {
			"main": [
				[
					{
						"node": "Read Content Metadata",
						"type": "main",
						"index": 0
					}
				]
			]
		},
		"Read Content Metadata": {
			"main": [
				[
					{
						"node": "Post to Pinterest",
						"type": "main",
						"index": 0
					},
					{
						"node": "Post to Twitter",
						"type": "main",
						"index": 0
					}
				]
			]
		}
	}
}
```

## Best Practices

### 1. Content Optimization

**Image Guidelines:**

- Use high-quality images (at least 600px wide)
- Optimize for Pinterest's 2:3 aspect ratio (1000x1500px recommended)
- Keep file sizes under 8MB for faster uploads
- Use descriptive filenames

**Pin Descriptions:**

- Write compelling, keyword-rich descriptions (up to 500 characters)
- Include relevant hashtags (3-5 per pin)
- Add a clear call-to-action
- Include your website URL when appropriate

**Board Organization:**

- Create themed boards with clear, descriptive names
- Use board descriptions to explain the content theme
- Organize boards by topic, season, or campaign
- Keep board names under 50 characters

### 2. Workflow Design

**Error Handling:**

```json
{
	"parameters": {
		"conditions": {
			"options": {
				"caseSensitive": true,
				"leftValue": "",
				"typeValidation": "strict"
			},
			"conditions": [
				{
					"id": "check-success",
					"leftValue": "{{ $node['Create Pin'].json.error }}",
					"rightValue": "",
					"operator": {
						"type": "string",
						"operation": "isEmpty"
					}
				}
			],
			"combinator": "and"
		},
		"options": {}
	},
	"type": "n8n-nodes-base.if",
	"name": "Check Pin Creation Success"
}
```

**Rate Limit Management:**

```json
{
	"parameters": {
		"amount": 5,
		"unit": "seconds"
	},
	"type": "n8n-nodes-base.wait",
	"name": "Rate Limit Delay"
}
```

**Batch Processing:**

```json
{
	"parameters": {
		"batchSize": 10,
		"options": {
			"reset": false
		}
	},
	"type": "n8n-nodes-base.itemLists",
	"name": "Process in Batches"
}
```

### 3. Security and Privacy

**Credential Management:**

- Use n8n's secure credential storage
- Never hardcode API keys in workflows
- Regularly rotate Pinterest app credentials
- Use environment variables for sensitive configuration

**Data Privacy:**

- Respect user privacy in automated content
- Follow Pinterest's community guidelines
- Implement proper consent mechanisms
- Regularly audit automated content

**Access Control:**

- Use appropriate Pinterest board privacy settings
- Limit workflow access to authorized users
- Implement proper authentication for webhook triggers
- Monitor workflow execution logs

### 4. Performance Optimization

**Efficient API Usage:**

- Batch operations when possible
- Cache frequently accessed data
- Use conditional logic to avoid unnecessary API calls
- Implement proper pagination for large datasets

**Workflow Optimization:**

- Use filters to process only relevant data
- Implement early exit conditions
- Optimize image processing before upload
- Use parallel processing for independent operations

**Monitoring and Alerting:**

```json
{
	"name": "Pinterest Workflow Monitoring",
	"nodes": [
		{
			"parameters": {
				"conditions": {
					"options": {
						"caseSensitive": true,
						"leftValue": "",
						"typeValidation": "strict"
					},
					"conditions": [
						{
							"id": "error-check",
							"leftValue": "{{ $json.error }}",
							"rightValue": "",
							"operator": {
								"type": "string",
								"operation": "isNotEmpty"
							}
						}
					],
					"combinator": "and"
				},
				"options": {}
			},
			"type": "n8n-nodes-base.if",
			"name": "Check for Errors"
		},
		{
			"parameters": {
				"resource": "message",
				"operation": "sendMessage",
				"chatId": "your-chat-id",
				"text": "Pinterest workflow error: {{ $json.error }}"
			},
			"type": "n8n-nodes-base.telegram",
			"name": "Send Error Alert"
		}
	]
}
```

## Troubleshooting Common Issues

### Authentication Problems

**Issue:** "Authentication failed" errors
**Solution:**

1. Verify Pinterest app credentials
2. Check redirect URI configuration
3. Ensure continuous refresh is enabled
4. Reconnect Pinterest account in n8n

### Rate Limiting

**Issue:** "Rate limit exceeded" errors
**Solution:**

1. Implement delays between operations
2. Use batch processing for multiple items
3. Monitor API usage patterns
4. Optimize workflow frequency

### Media Upload Failures

**Issue:** Image/video upload errors
**Solution:**

1. Check file format compatibility
2. Verify file size limits
3. Optimize media before upload
4. Handle upload timeouts gracefully

### Data Transformation

**Issue:** Incorrect data mapping
**Solution:**

1. Use n8n's data transformation tools
2. Validate input data structure
3. Implement proper error handling
4. Test with sample data first

## Advanced Tips and Tricks

### 1. Dynamic Board Selection

Use expressions to dynamically select boards based on content:

```javascript
// Dynamic board selection based on content category
{
	{
		$json.category === 'travel'
			? 'travel_board_id'
			: $json.category === 'food'
				? 'food_board_id'
				: 'general_board_id';
	}
}
```

### 2. Content Scheduling

Implement content scheduling with n8n's cron trigger:

```json
{
	"parameters": {
		"rule": {
			"interval": [
				{
					"field": "cronExpression",
					"expression": "0 9,15,21 * * *"
				}
			]
		}
	},
	"type": "n8n-nodes-base.cron",
	"name": "Schedule Posts (9 AM, 3 PM, 9 PM)"
}
```

### 3. A/B Testing Pins

Create variations of pins to test performance:

```javascript
// A/B test pin titles
{
	{
		Math.random() > 0.5 ? $json.title_variant_a : $json.title_variant_b;
	}
}
```

### 4. Hashtag Optimization

Automatically generate relevant hashtags:

```javascript
// Generate hashtags from keywords
{
	{
		$json.keywords
			.split(',')
			.map((keyword) => '#' + keyword.trim().replace(/\s+/g, ''))
			.join(' ');
	}
}
```

### 5. Performance Tracking

Track pin performance over time:

```json
{
	"name": "Pin Performance Tracker",
	"nodes": [
		{
			"parameters": {
				"resource": "search",
				"operation": "pins",
				"query": "from:{{ $json.username }}",
				"limit": 100
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"name": "Get My Pins"
		},
		{
			"parameters": {
				"resource": "pin",
				"operation": "getAnalytics",
				"pinId": "{{ $json.pinId }}",
				"startDate": "{{ $now.minus({days: 7}).toISODate() }}",
				"endDate": "{{ $now.toISODate() }}"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"name": "Get Pin Analytics"
		}
	]
}
```

## Integration Examples

### 1. WordPress to Pinterest

Automatically pin new WordPress blog posts:

```json
{
	"name": "WordPress to Pinterest Integration",
	"nodes": [
		{
			"parameters": {
				"url": "https://yoursite.com/wp-json/wp/v2/posts",
				"options": {
					"queryParameters": {
						"parameters": [
							{
								"name": "after",
								"value": "{{ $now.minus({hours: 1}).toISO() }}"
							}
						]
					}
				}
			},
			"type": "n8n-nodes-base.httpRequest",
			"name": "Get New WordPress Posts"
		},
		{
			"parameters": {
				"resource": "pin",
				"operation": "create",
				"boardId": "blog_board_id",
				"mediaSource": "url",
				"mediaUrl": "{{ $json.featured_media_url }}",
				"title": "{{ $json.title.rendered }}",
				"description": "{{ $json.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 400) }}",
				"link": "{{ $json.link }}"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"name": "Create Pinterest Pin"
		}
	]
}
```

### 2. Shopify Product Sync

Sync Shopify products to Pinterest:

```json
{
	"name": "Shopify to Pinterest Product Sync",
	"nodes": [
		{
			"parameters": {
				"resource": "product",
				"operation": "getAll",
				"returnAll": false,
				"limit": 50
			},
			"type": "n8n-nodes-base.shopify",
			"name": "Get Shopify Products"
		},
		{
			"parameters": {
				"resource": "pin",
				"operation": "create",
				"boardId": "products_board_id",
				"mediaSource": "url",
				"mediaUrl": "{{ $json.image.src }}",
				"title": "{{ $json.title }}",
				"description": "{{ $json.body_html.replace(/<[^>]*>/g, '').substring(0, 400) }} Price: ${{ $json.variants[0].price }}",
				"link": "https://yourstore.com/products/{{ $json.handle }}"
			},
			"type": "n8n-nodes-pinterest.pinterest",
			"name": "Create Product Pin"
		}
	]
}
```

This user guide provides comprehensive information to help you leverage the Pinterest node effectively in your n8n workflows. Start with the basic examples and gradually implement more advanced features as you become comfortable with the node's capabilities.
