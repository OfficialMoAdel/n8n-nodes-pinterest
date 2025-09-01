import { NodeOperationError } from 'n8n-workflow';
import { SecurityValidator } from '../SecurityValidator';
import { CredentialSecurityValidator } from '../CredentialSecurityValidator';
import { AuditLogger } from '../AuditLogger';
import { SecurityMiddleware } from '../SecurityMiddleware';

// Mock console methods for audit logging tests
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('Security Integration Tests', () => {
	let mockNode: any;
	let mockExecuteFunctions: any;
	let mockCredentials: any;

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

		mockCredentials = {
			clientId: '1234567890123456789',
			clientSecret: 'Kj8#mP2$nQ9@vR5%wS1!xT7&yU3*zA6^', // Strong secret
			scope: 'user_accounts:read,boards:read,boards:write,pins:read,pins:write',
			oauthTokenData: {
				access_token: 'valid_access_token_1234567890',
				refresh_token: 'valid_refresh_token_0987654321',
				expires_at: Math.floor(Date.now() / 1000) + 3600,
			},
		};

		// Clear mock calls
		mockConsoleInfo.mockClear();
		mockConsoleWarn.mockClear();
		mockConsoleError.mockClear();
	});

	afterAll(() => {
		mockConsoleInfo.mockRestore();
		mockConsoleWarn.mockRestore();
		mockConsoleError.mockRestore();
	});

	describe('End-to-End Security Validation', () => {
		it('should validate complete pin creation workflow with security', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);

			const securityMiddleware = new SecurityMiddleware(mockExecuteFunctions, mockNode, 0);

			// Step 1: Validate credentials
			const credentials = await securityMiddleware.validateCredentials();
			expect(credentials).toBe(mockCredentials);

			// Step 2: Validate operation permissions
			expect(() => {
				securityMiddleware.validateOperationPermissions(credentials, 'create', 'pin');
			}).not.toThrow();

			// Step 3: Sanitize input parameters
			const rawParams = {
				boardId: '  valid_board_123  ',
				mediaSource: 'url',
				mediaUrl: 'https://example.com/image.jpg',
				title: 'My Pin <script>alert("xss")</script>',
				description: 'Pin description with dangerous content',
				link: 'https://example.com/link',
			};

			const sanitizedParams = securityMiddleware.sanitizePinCreateParams(rawParams);

			expect(sanitizedParams.boardId).toBe('valid_board_123');
			expect(sanitizedParams.title).toBe('My Pin ');
			expect(sanitizedParams.description).toBe('Pin description with dangerous content');

			// Step 4: Log the operation
			securityMiddleware.logApiOperation('create', 'pin', credentials, true, {
				responseTime: 250,
				statusCode: 201,
			});

			// Verify audit log was created
			expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));
		});

		it('should detect and prevent security violations', async () => {
			const securityValidator = new SecurityValidator(mockNode);

			// Test XSS prevention
			const maliciousTitle = '<script>alert("xss")</script>Malicious Title';
			const sanitizedTitle = securityValidator.sanitizePinTitle(maliciousTitle);
			expect(sanitizedTitle).not.toContain('<script>');

			// Test SQL injection prevention
			expect(() => {
				securityValidator.validateSearchQuery("'; DROP TABLE users; --");
			}).toThrow(NodeOperationError);

			// Test dangerous URL prevention
			expect(() => {
				securityValidator.sanitizeUrl('javascript:alert("xss")', 'test URL');
			}).toThrow(NodeOperationError);

			// Test file upload validation
			const maliciousFile = {
				size: 20 * 1024 * 1024, // 20MB (over limit)
				mimeType: 'application/exe',
				name: 'malicious.exe',
			};

			expect(() => {
				securityValidator.validateFileUpload(maliciousFile, 'test file');
			}).toThrow(NodeOperationError);
		});

		it('should validate credential security comprehensively', () => {
			const credentialValidator = new CredentialSecurityValidator(mockNode);

			// Test valid credentials
			expect(() => {
				credentialValidator.validateCredentials(mockCredentials);
			}).not.toThrow();

			// Test weak credentials
			const weakCredentials = {
				clientId: '123', // Too short
				clientSecret: 'password123456789012345678', // Weak pattern
				scope: 'invalid_scope',
				oauthTokenData: {
					access_token: 'short', // Invalid format
				},
			};

			expect(() => {
				credentialValidator.validateCredentials(weakCredentials);
			}).toThrow(NodeOperationError);

			// Test test credentials
			const testCredentials = {
				clientId: 'test_client_id_123',
				clientSecret: 'demo_client_secret_456',
				scope: 'user_accounts:read',
				oauthTokenData: {
					access_token: 'valid_access_token_1234567890',
				},
			};

			expect(() => {
				credentialValidator.validateCredentials(testCredentials);
			}).toThrow(NodeOperationError);
		});

		it('should create comprehensive audit trail', () => {
			const auditLogger = new AuditLogger(mockNode, 'test-workflow', 'test-execution');

			// Test authentication logging
			auditLogger.logAuthenticationEvent('success', mockCredentials, {
				userId: 'user123',
				username: 'testuser',
			});

			// Test API operation logging
			auditLogger.logApiOperation('create', 'pin', mockCredentials, true, {
				responseTime: 250,
				statusCode: 201,
				resourceId: 'pin123',
			});

			// Test security violation logging
			auditLogger.logSecurityViolation('suspicious_activity', {
				description: 'Multiple failed attempts',
				attemptCount: 5,
			});

			// Test rate limit logging
			auditLogger.logRateLimitEvent('exceeded', mockCredentials, {
				limit: 1000,
				remaining: 0,
				reset: Math.floor(Date.now() / 1000) + 3600,
			});

			// Verify all logs were created
			expect(mockConsoleInfo).toHaveBeenCalledTimes(2); // auth success + api operation
			expect(mockConsoleWarn).toHaveBeenCalledTimes(1); // rate limit
			expect(mockConsoleError).toHaveBeenCalledTimes(1); // security violation
		});

		it('should handle security middleware integration', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);

			const securityMiddleware = SecurityMiddleware.createForOperation(
				mockExecuteFunctions,
				mockNode,
				0,
			);

			// Test credential validation
			const credentials = await securityMiddleware.validateCredentials();
			expect(credentials).toBe(mockCredentials);

			// Test parameter sanitization
			const searchParams = {
				query: 'cats and dogs',
				limit: '25',
				creativeTypes: 'regular,video',
				isPromoted: 'true',
			};

			const sanitizedSearch = securityMiddleware.sanitizeSearchParams(searchParams);
			expect(sanitizedSearch.query).toBe('cats and dogs');
			expect(sanitizedSearch.limit).toBe(25);
			expect(sanitizedSearch.creativeTypes).toEqual(['regular', 'video']);
			expect(sanitizedSearch.isPromoted).toBe(true);

			// Test analytics parameter validation
			const analyticsParams = {
				startDate: '2023-01-01',
				endDate: '2023-12-31',
				metricTypes: ['IMPRESSION', 'SAVE'],
			};

			const sanitizedAnalytics = securityMiddleware.sanitizeAnalyticsParams(analyticsParams);
			expect(sanitizedAnalytics.startDate).toBe('2023-01-01');
			expect(sanitizedAnalytics.endDate).toBe('2023-12-31');
			expect(sanitizedAnalytics.metricTypes).toEqual(['IMPRESSION', 'SAVE']);
		});
	});

	describe('Security Edge Cases', () => {
		it('should handle null and undefined inputs safely', () => {
			const securityValidator = new SecurityValidator(mockNode);

			// Test null inputs
			expect(securityValidator.sanitizeString(null as any, 'test')).toBe('');
			expect(securityValidator.sanitizeUrl(null as any, 'test')).toBe('');
			expect(securityValidator.validateNumericParameter(null, 'test')).toBeUndefined();

			// Test undefined inputs
			expect(securityValidator.sanitizeString(undefined, 'test')).toBe('');
			expect(securityValidator.sanitizeUrl(undefined, 'test')).toBe('');
			expect(securityValidator.validateNumericParameter(undefined, 'test')).toBeUndefined();
		});

		it('should handle malformed data gracefully', () => {
			const securityValidator = new SecurityValidator(mockNode);

			// Test malformed JSON-like strings
			const malformedData = '{"incomplete": json';
			const sanitized = securityValidator.sanitizeString(malformedData, 'test');
			expect(sanitized).toBe('{"incomplete": json');

			// Test extremely long inputs
			const longInput = 'a'.repeat(20000);
			expect(() => {
				securityValidator.sanitizeString(longInput, 'test');
			}).toThrow(NodeOperationError);

			// Test binary data
			const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
			expect(() => {
				securityValidator.sanitizeString(binaryData as any, 'test');
			}).toThrow(NodeOperationError);
		});

		it('should validate complex nested objects', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);

			const securityMiddleware = new SecurityMiddleware(mockExecuteFunctions, mockNode, 0);

			// Test complex pin creation with nested data
			const complexParams = {
				boardId: 'valid_board_123',
				mediaSource: 'upload',
				mediaFile: {
					size: 5 * 1024 * 1024, // 5MB
					mimeType: 'image/jpeg',
					name: 'complex_image.jpg',
					metadata: {
						width: 1920,
						height: 1080,
						description: 'High resolution image',
					},
				},
				title: 'Complex Pin Title',
				description: 'Complex description with émojis 🎨 and unicode ñ',
				link: 'https://example.com/complex-link?param1=value1&param2=value2',
				altText: 'Accessibility text for screen readers',
			};

			const sanitized = securityMiddleware.sanitizePinCreateParams(complexParams);

			expect(sanitized.boardId).toBe('valid_board_123');
			expect(sanitized.mediaSource).toBe('upload');
			expect(sanitized.mediaFile).toBe(complexParams.mediaFile);
			expect(sanitized.title).toBe('Complex Pin Title');
			expect(sanitized.description).toBe('Complex description with émojis 🎨 and unicode ñ');
			expect(sanitized.link).toBe('https://example.com/complex-link?param1=value1&param2=value2');
		});

		it('should maintain audit trail consistency across operations', () => {
			const auditLogger = new AuditLogger(mockNode, 'workflow-123', 'execution-456');

			// Perform multiple operations
			auditLogger.logAuthenticationEvent('success', mockCredentials);
			auditLogger.logApiOperation('create', 'pin', mockCredentials, true);
			auditLogger.logApiOperation('update', 'pin', mockCredentials, true);
			auditLogger.logApiOperation('delete', 'pin', mockCredentials, true);

			// Verify consistent credential hashing
			const logs = [
				mockConsoleInfo.mock.calls[0][0],
				mockConsoleInfo.mock.calls[1][0],
				mockConsoleInfo.mock.calls[2][0],
				mockConsoleInfo.mock.calls[3][0],
			];

			const parsedLogs = logs.map((log) => JSON.parse(log.replace('[AUDIT] ', '')));
			const credentialHashes = parsedLogs.map((log) => log.credential_hash);

			// All should have the same credential hash
			expect(credentialHashes[0]).toBe(credentialHashes[1]);
			expect(credentialHashes[1]).toBe(credentialHashes[2]);
			expect(credentialHashes[2]).toBe(credentialHashes[3]);

			// All should have different session IDs
			const sessionIds = parsedLogs.map((log) => log.session_id);
			expect(new Set(sessionIds).size).toBe(sessionIds.length);
		});
	});

	describe('Performance and Security Balance', () => {
		it('should validate inputs efficiently without blocking', () => {
			const securityValidator = new SecurityValidator(mockNode);
			const startTime = Date.now();

			// Validate multiple inputs
			for (let i = 0; i < 100; i++) {
				securityValidator.sanitizeString(`Test string ${i}`, 'test');
				securityValidator.sanitizeUrl(`https://example.com/path${i}`, 'test');
				securityValidator.validateNumericParameter(i, 'test', 0, 1000);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Should complete within reasonable time (less than 1 second for 100 validations)
			expect(duration).toBeLessThan(1000);
		});

		it('should handle concurrent security operations', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);

			const promises = [];

			// Create multiple security middleware instances concurrently
			for (let i = 0; i < 10; i++) {
				const securityMiddleware = new SecurityMiddleware(mockExecuteFunctions, mockNode, i);
				promises.push(securityMiddleware.validateCredentials());
			}

			// All should complete successfully
			const results = await Promise.all(promises);
			results.forEach((result) => {
				expect(result).toBe(mockCredentials);
			});
		});

		it('should maintain security under load', () => {
			const auditLogger = new AuditLogger(mockNode, 'load-test-workflow', 'load-test-execution');

			// Generate many audit events quickly
			for (let i = 0; i < 50; i++) {
				auditLogger.logApiOperation('get', 'pin', mockCredentials, true, {
					responseTime: Math.random() * 1000,
					statusCode: 200,
				});
			}

			// Should not crash or lose events
			expect(mockConsoleInfo).toHaveBeenCalledTimes(50);
		});
	});
});
