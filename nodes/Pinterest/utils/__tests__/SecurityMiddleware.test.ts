import { NodeOperationError } from 'n8n-workflow';
import { SecurityMiddleware } from '../SecurityMiddleware';

describe('SecurityMiddleware', () => {
	let securityMiddleware: SecurityMiddleware;
	let mockExecuteFunctions: any;
	let mockNode: any;

	beforeEach(() => {
		mockNode = {
			id: 'test-node-id',
			name: 'Test Pinterest Node',
			type: 'n8n-nodes-pinterest.pinterest',
		};

		mockExecuteFunctions = {
			getCredentials: jest.fn(),
			getNodeParameter: jest.fn(),
			getWorkflow: jest.fn(() => ({ id: 'test-workflow-id' })),
			getExecutionId: jest.fn(() => 'test-execution-id'),
		};

		securityMiddleware = new SecurityMiddleware(mockExecuteFunctions, mockNode, 0);
	});

	describe('validateCredentials', () => {
		it('should validate and return valid credentials', async () => {
			const mockCredentials = {
				clientId: '1234567890123456789',
				clientSecret: 'Kj8#mP2$nQ9@vR5%wS1!xT7&yU3*zA6^', // Strong secret
				scope: 'user_accounts:read,boards:read,pins:read',
				oauthTokenData: {
					access_token: 'valid_access_token_1234567890',
				},
			};

			mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);

			const result = await securityMiddleware.validateCredentials();
			expect(result).toBe(mockCredentials);
			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('pinterestOAuth2Api');
		});

		it('should throw error for invalid credentials', async () => {
			const invalidCredentials = {
				clientId: 'test', // Too short
				clientSecret: 'short',
				scope: 'invalid_scope',
			};

			mockExecuteFunctions.getCredentials.mockResolvedValue(invalidCredentials);

			await expect(securityMiddleware.validateCredentials()).rejects.toThrow(NodeOperationError);
		});
	});

	describe('validateOperationPermissions', () => {
		it('should validate sufficient permissions', () => {
			const credentials = {
				scope: 'user_accounts:read,pins:write,boards:read',
			};

			expect(() => {
				securityMiddleware.validateOperationPermissions(credentials, 'create', 'pin');
			}).not.toThrow();
		});

		it('should throw error for insufficient permissions', () => {
			const credentials = {
				scope: 'user_accounts:read,pins:read', // Missing pins:write
			};

			expect(() => {
				securityMiddleware.validateOperationPermissions(credentials, 'create', 'pin');
			}).toThrow(NodeOperationError);
		});
	});

	describe('sanitizePinCreateParams', () => {
		it('should sanitize valid pin creation parameters', () => {
			const params = {
				boardId: 'valid_board_123',
				mediaSource: 'url',
				mediaUrl: 'https://example.com/image.jpg',
				title: '  My Pin Title  ',
				description: 'Pin description with <script>alert()</script>',
				link: 'https://example.com/link',
				altText: 'Alt text for accessibility',
			};

			const result = securityMiddleware.sanitizePinCreateParams(params);

			expect(result.boardId).toBe('valid_board_123');
			expect(result.mediaSource).toBe('url');
			expect(result.mediaUrl).toBe('https://example.com/image.jpg');
			expect(result.title).toBe('My Pin Title');
			expect(result.description).toBe('Pin description with ');
			expect(result.link).toBe('https://example.com/link');
			expect(result.altText).toBe('Alt text for accessibility');
		});

		it('should validate file upload parameters', () => {
			const params = {
				boardId: 'valid_board_123',
				mediaSource: 'upload',
				mediaFile: {
					size: 1024 * 1024, // 1MB
					mimeType: 'image/jpeg',
					name: 'test.jpg',
				},
				title: 'Uploaded Pin',
			};

			const result = securityMiddleware.sanitizePinCreateParams(params);

			expect(result.boardId).toBe('valid_board_123');
			expect(result.mediaSource).toBe('upload');
			expect(result.mediaFile).toBe(params.mediaFile);
			expect(result.title).toBe('Uploaded Pin');
		});

		it('should throw error for missing board ID', () => {
			const params = {
				mediaSource: 'url',
				mediaUrl: 'https://example.com/image.jpg',
			};

			expect(() => {
				securityMiddleware.sanitizePinCreateParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should throw error for invalid media source', () => {
			const params = {
				boardId: 'valid_board_123',
				mediaSource: 'invalid',
			};

			expect(() => {
				securityMiddleware.sanitizePinCreateParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should throw error for malicious URLs', () => {
			const params = {
				boardId: 'valid_board_123',
				mediaSource: 'url',
				mediaUrl: 'javascript:alert("xss")',
			};

			expect(() => {
				securityMiddleware.sanitizePinCreateParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should validate file upload size limits', () => {
			const params = {
				boardId: 'valid_board_123',
				mediaSource: 'upload',
				mediaFile: {
					size: 15 * 1024 * 1024, // 15MB (over limit for images)
					mimeType: 'image/jpeg',
					name: 'large.jpg',
				},
			};

			expect(() => {
				securityMiddleware.sanitizePinCreateParams(params);
			}).toThrow(NodeOperationError);
		});
	});

	describe('sanitizePinUpdateParams', () => {
		it('should sanitize pin update parameters', () => {
			const params = {
				pinId: 'valid_pin_456',
				title: 'Updated Title',
				description: 'Updated description',
				link: 'https://example.com/updated',
				boardId: 'new_board_789',
			};

			const result = securityMiddleware.sanitizePinUpdateParams(params);

			expect(result.pinId).toBe('valid_pin_456');
			expect(result.title).toBe('Updated Title');
			expect(result.description).toBe('Updated description');
			expect(result.link).toBe('https://example.com/updated');
			expect(result.boardId).toBe('new_board_789');
		});

		it('should handle partial updates', () => {
			const params = {
				pinId: 'valid_pin_456',
				title: 'Only updating title',
			};

			const result = securityMiddleware.sanitizePinUpdateParams(params);

			expect(result.pinId).toBe('valid_pin_456');
			expect(result.title).toBe('Only updating title');
			expect(result.description).toBeUndefined();
			expect(result.link).toBeUndefined();
		});

		it('should throw error for missing pin ID', () => {
			const params = {
				title: 'Updated Title',
			};

			expect(() => {
				securityMiddleware.sanitizePinUpdateParams(params);
			}).toThrow(NodeOperationError);
		});
	});

	describe('sanitizeBoardCreateParams', () => {
		it('should sanitize board creation parameters', () => {
			const params = {
				name: '  My Board Name  ',
				description: 'Board description',
				privacy: 'PUBLIC',
			};

			const result = securityMiddleware.sanitizeBoardCreateParams(params);

			expect(result.name).toBe('My Board Name');
			expect(result.description).toBe('Board description');
			expect(result.privacy).toBe('public');
		});

		it('should throw error for missing board name', () => {
			const params = {
				description: 'Board description',
				privacy: 'public',
			};

			expect(() => {
				securityMiddleware.sanitizeBoardCreateParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should default to public privacy', () => {
			const params = {
				name: 'My Board',
			};

			const result = securityMiddleware.sanitizeBoardCreateParams(params);

			expect(result.privacy).toBe('public');
		});

		it('should throw error for invalid privacy setting', () => {
			const params = {
				name: 'My Board',
				privacy: 'invalid_privacy',
			};

			expect(() => {
				securityMiddleware.sanitizeBoardCreateParams(params);
			}).toThrow(NodeOperationError);
		});
	});

	describe('sanitizeSearchParams', () => {
		it('should sanitize search parameters', () => {
			const params = {
				query: 'cats and dogs',
				limit: '25',
				bookmark: 'next_page_token',
				creativeTypes: ['regular', 'video'],
				isPromoted: 'true',
			};

			const result = securityMiddleware.sanitizeSearchParams(params);

			expect(result.query).toBe('cats and dogs');
			expect(result.limit).toBe(25);
			expect(result.bookmark).toBe('next_page_token');
			expect(result.creativeTypes).toEqual(['regular', 'video']);
			expect(result.isPromoted).toBe(true);
		});

		it('should throw error for missing search query', () => {
			const params = {
				limit: 25,
			};

			expect(() => {
				securityMiddleware.sanitizeSearchParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should detect SQL injection in search query', () => {
			const params = {
				query: "'; DROP TABLE users; --",
			};

			expect(() => {
				securityMiddleware.sanitizeSearchParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should validate creative types against allowed values', () => {
			const params = {
				query: 'test search',
				creativeTypes: ['regular', 'invalid_type'],
			};

			expect(() => {
				securityMiddleware.sanitizeSearchParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should validate numeric limits', () => {
			const params = {
				query: 'test search',
				limit: '500', // Over maximum
			};

			expect(() => {
				securityMiddleware.sanitizeSearchParams(params);
			}).toThrow(NodeOperationError);
		});
	});

	describe('sanitizeAnalyticsParams', () => {
		it('should sanitize analytics parameters', () => {
			const params = {
				startDate: '2023-01-01',
				endDate: '2023-12-31',
				metricTypes: ['IMPRESSION', 'SAVE'],
			};

			const result = securityMiddleware.sanitizeAnalyticsParams(params);

			expect(result.startDate).toBe('2023-01-01');
			expect(result.endDate).toBe('2023-12-31');
			expect(result.metricTypes).toEqual(['IMPRESSION', 'SAVE']);
		});

		it('should throw error for missing date range', () => {
			const params = {
				startDate: '2023-01-01',
				// Missing endDate
			};

			expect(() => {
				securityMiddleware.sanitizeAnalyticsParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should validate date range order', () => {
			const params = {
				startDate: '2023-12-31',
				endDate: '2023-01-01', // End before start
			};

			expect(() => {
				securityMiddleware.sanitizeAnalyticsParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should validate date range length', () => {
			const params = {
				startDate: '2020-01-01',
				endDate: '2023-12-31', // More than 1 year
			};

			expect(() => {
				securityMiddleware.sanitizeAnalyticsParams(params);
			}).toThrow(NodeOperationError);
		});

		it('should validate metric types', () => {
			const params = {
				startDate: '2023-01-01',
				endDate: '2023-12-31',
				metricTypes: ['IMPRESSION', 'INVALID_METRIC'],
			};

			expect(() => {
				securityMiddleware.sanitizeAnalyticsParams(params);
			}).toThrow(NodeOperationError);
		});
	});

	describe('getSecureParameter', () => {
		it('should get parameter value securely', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('test_value');

			const result = securityMiddleware.getSecureParameter('testParam');

			expect(result).toBe('test_value');
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('testParam', 0, undefined);
		});

		it('should use fallback value when provided', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('fallback_value');

			const result = securityMiddleware.getSecureParameter('testParam', 'fallback_value');

			expect(result).toBe('fallback_value');
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'testParam',
				0,
				'fallback_value',
			);
		});

		it('should handle parameter access errors', () => {
			const error = new Error('Parameter not found');
			mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
				throw error;
			});

			expect(() => {
				securityMiddleware.getSecureParameter('testParam');
			}).toThrow(error);
		});
	});

	describe('logging methods', () => {
		let mockCredentials: any;

		beforeEach(() => {
			mockCredentials = {
				clientId: '1234567890123456789',
				clientSecret: 'Kj8#mP2$nQ9@vR5%wS1!xT7&yU3*zA6^', // Strong secret
				scope: 'user_accounts:read,boards:read,pins:read',
			};
		});

		it('should log API operations', () => {
			const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

			securityMiddleware.logApiOperation('create', 'pin', mockCredentials, true, {
				responseTime: 250,
			});

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			consoleSpy.mockRestore();
		});

		it('should log authentication events', () => {
			const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

			securityMiddleware.logAuthenticationEvent('success', mockCredentials);

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			consoleSpy.mockRestore();
		});

		it('should log rate limit events', () => {
			const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

			securityMiddleware.logRateLimitEvent('approaching', mockCredentials, {
				limit: 1000,
				remaining: 100,
			});

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			consoleSpy.mockRestore();
		});

		it('should log security violations', () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

			securityMiddleware.logSecurityViolation('suspicious_activity', {
				description: 'Test violation',
			});

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			consoleSpy.mockRestore();
		});
	});

	describe('static factory method', () => {
		it('should create security middleware instance', () => {
			const middleware = SecurityMiddleware.createForOperation(mockExecuteFunctions, mockNode, 1);

			expect(middleware).toBeInstanceOf(SecurityMiddleware);
			expect(middleware['itemIndex']).toBe(1);
		});
	});

	describe('edge cases and error handling', () => {
		it('should handle empty string parameters gracefully', () => {
			const params = {
				boardId: 'valid_board_123',
				mediaSource: 'url',
				mediaUrl: 'https://example.com/image.jpg',
				title: '',
				description: '',
				link: '',
			};

			const result = securityMiddleware.sanitizePinCreateParams(params);

			expect(result.title).toBe('');
			expect(result.description).toBe('');
			expect(result.link).toBe('');
		});

		it('should handle undefined optional parameters', () => {
			const params = {
				boardId: 'valid_board_123',
				mediaSource: 'url',
				mediaUrl: 'https://example.com/image.jpg',
				// title, description, link are undefined
			};

			const result = securityMiddleware.sanitizePinCreateParams(params);

			expect(result.title).toBe('');
			expect(result.description).toBe('');
			expect(result.link).toBe('');
		});

		it('should handle array parameters as comma-separated strings', () => {
			const params = {
				query: 'test search',
				creativeTypes: 'regular,video,shopping',
			};

			const result = securityMiddleware.sanitizeSearchParams(params);

			expect(result.creativeTypes).toEqual(['regular', 'video', 'shopping']);
		});
	});
});
