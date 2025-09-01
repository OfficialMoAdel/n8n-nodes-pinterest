import { NodeOperationError } from 'n8n-workflow';
import { CredentialSecurityValidator } from '../CredentialSecurityValidator';

describe('CredentialSecurityValidator', () => {
	let validator: CredentialSecurityValidator;
	let mockNode: any;

	beforeEach(() => {
		mockNode = {
			id: 'test-node-id',
			name: 'Test Pinterest Node',
			type: 'n8n-nodes-pinterest.pinterest',
		};
		validator = new CredentialSecurityValidator(mockNode);
	});

	describe('validateCredentials', () => {
		it('should validate valid credentials', () => {
			const validCredentials = {
				clientId: '1234567890123456789',
				clientSecret: 'Kj8#mP2$nQ9@vR5%wS1!xT7&yU3*zA6^', // Strong secret
				scope: 'user_accounts:read,boards:read,pins:read',
				oauthTokenData: {
					access_token: 'valid_access_token_1234567890',
					refresh_token: 'valid_refresh_token_0987654321',
					expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
				},
			};

			expect(() => validator.validateCredentials(validCredentials)).not.toThrow();
		});

		it('should throw error for missing client ID', () => {
			const invalidCredentials = {
				clientSecret: 'abcdef1234567890abcdef1234567890',
				scope: 'user_accounts:read',
				oauthTokenData: {
					access_token: 'valid_access_token_1234567890',
				},
			};

			expect(() => validator.validateCredentials(invalidCredentials)).toThrow(NodeOperationError);
		});

		it('should throw error for missing client secret', () => {
			const invalidCredentials = {
				clientId: '1234567890123456789',
				scope: 'user_accounts:read',
				oauthTokenData: {
					access_token: 'valid_access_token_1234567890',
				},
			};

			expect(() => validator.validateCredentials(invalidCredentials)).toThrow(NodeOperationError);
		});

		it('should throw error for missing OAuth token data', () => {
			const invalidCredentials = {
				clientId: '1234567890123456789',
				clientSecret: 'abcdef1234567890abcdef1234567890',
				scope: 'user_accounts:read',
			};

			expect(() => validator.validateCredentials(invalidCredentials)).toThrow(NodeOperationError);
		});
	});

	describe('validateClientId', () => {
		it('should validate valid numeric client ID', () => {
			const validClientId = '1234567890123456789';
			expect(() => validator['validateClientId'](validClientId)).not.toThrow();
		});

		it('should throw error for short client ID', () => {
			const shortClientId = '123';
			expect(() => validator['validateClientId'](shortClientId)).toThrow(NodeOperationError);
		});

		it('should throw error for non-numeric client ID', () => {
			const nonNumericClientId = 'abc123def456';
			expect(() => validator['validateClientId'](nonNumericClientId)).toThrow(NodeOperationError);
		});

		it('should throw error for test/placeholder client ID', () => {
			const testClientId = 'test_client_id_123';
			expect(() => validator['validateClientId'](testClientId)).toThrow(NodeOperationError);
		});

		it('should throw error for demo client ID', () => {
			const demoClientId = 'demo1234567890';
			expect(() => validator['validateClientId'](demoClientId)).toThrow(NodeOperationError);
		});

		it('should throw error for example client ID', () => {
			const exampleClientId = 'example123456789';
			expect(() => validator['validateClientId'](exampleClientId)).toThrow(NodeOperationError);
		});
	});

	describe('validateClientSecret', () => {
		it('should validate valid client secret', () => {
			const validSecret = 'Kj8#mP2$nQ9@vR5%wS1!xT7&yU3*zA6^'; // Strong secret
			expect(() => validator['validateClientSecret'](validSecret)).not.toThrow();
		});

		it('should throw error for short client secret', () => {
			const shortSecret = 'short';
			expect(() => validator['validateClientSecret'](shortSecret)).toThrow(NodeOperationError);
		});

		it('should throw error for test/placeholder secret', () => {
			const testSecret = 'test_client_secret_123';
			expect(() => validator['validateClientSecret'](testSecret)).toThrow(NodeOperationError);
		});

		it('should throw error for weak secret patterns', () => {
			const weakSecrets = [
				'aaaaaaaaaaaaaaaaaaaaaa', // All same character
				'123456789012345678901234567890', // Sequential numbers
				'password123456789012345678', // Common word
				'abcdefghijklmnopqrstuvwxyz', // Only letters
			];

			weakSecrets.forEach((secret) => {
				expect(() => validator['validateClientSecret'](secret)).toThrow(NodeOperationError);
			});
		});
	});

	describe('validateOAuthTokens', () => {
		it('should validate valid token data', () => {
			const validTokenData = {
				access_token: 'valid_access_token_1234567890abcdef',
				refresh_token: 'valid_refresh_token_0987654321fedcba',
				expires_at: Math.floor(Date.now() / 1000) + 3600,
			};

			expect(() => validator['validateOAuthTokens'](validTokenData)).not.toThrow();
		});

		it('should throw error for missing access token', () => {
			const invalidTokenData = {
				refresh_token: 'valid_refresh_token_0987654321fedcba',
			};

			expect(() => validator['validateOAuthTokens'](invalidTokenData)).toThrow(NodeOperationError);
		});

		it('should throw error for invalid access token type', () => {
			const invalidTokenData = {
				access_token: 123456789,
			};

			expect(() => validator['validateOAuthTokens'](invalidTokenData)).toThrow(NodeOperationError);
		});

		it('should throw error for expired token', () => {
			const expiredTokenData = {
				access_token: 'valid_access_token_1234567890abcdef',
				expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
			};

			expect(() => validator['validateOAuthTokens'](expiredTokenData)).toThrow(NodeOperationError);
		});

		it('should throw error for invalid token format', () => {
			const invalidTokenData = {
				access_token: 'short', // Too short
			};

			expect(() => validator['validateOAuthTokens'](invalidTokenData)).toThrow(NodeOperationError);
		});
	});

	describe('validateScopes', () => {
		it('should validate required scopes', () => {
			const validScopes = 'user_accounts:read,boards:read,pins:read';
			expect(() => validator['validateScopes'](validScopes)).not.toThrow();
		});

		it('should throw error for missing required scope', () => {
			const invalidScopes = 'boards:read,pins:read'; // Missing user_accounts:read
			expect(() => validator['validateScopes'](invalidScopes)).toThrow(NodeOperationError);
		});

		it('should validate comprehensive scopes', () => {
			const comprehensiveScopes =
				'user_accounts:read,boards:read,boards:write,boards:read_secret,boards:write_secret,pins:read,pins:write,pins:read_secret,pins:write_secret';
			expect(() => validator['validateScopes'](comprehensiveScopes)).not.toThrow();
		});
	});

	describe('checkForTestCredentials', () => {
		it('should detect test client ID patterns', () => {
			const testCredentials = {
				clientId: '123456789', // Common test pattern
				clientSecret: 'real_client_secret_1234567890',
			};

			expect(() => validator['checkForTestCredentials'](testCredentials)).toThrow(
				NodeOperationError,
			);
		});

		it('should detect placeholder client secret', () => {
			const testCredentials = {
				clientId: '1234567890123456789',
				clientSecret: 'your_client_secret_here',
			};

			expect(() => validator['checkForTestCredentials'](testCredentials)).toThrow(
				NodeOperationError,
			);
		});

		it('should detect matching client ID and secret', () => {
			const testCredentials = {
				clientId: 'same_value_1234567890',
				clientSecret: 'same_value_1234567890',
			};

			expect(() => validator['checkForTestCredentials'](testCredentials)).toThrow(
				NodeOperationError,
			);
		});

		it('should pass valid production credentials', () => {
			const validCredentials = {
				clientId: '9876543210987654321',
				clientSecret: 'Kj8#mP2$nQ9@vR5%wS1!xT7&yU3*zA6^', // Strong production secret
			};

			expect(() => validator['checkForTestCredentials'](validCredentials)).not.toThrow();
		});
	});

	describe('validateOperationPermissions', () => {
		it('should validate sufficient permissions for pin creation', () => {
			const credentials = {
				scope: 'user_accounts:read,pins:write,boards:read',
			};

			expect(() =>
				validator.validateOperationPermissions(credentials, 'create', 'pin'),
			).not.toThrow();
		});

		it('should throw error for insufficient permissions', () => {
			const credentials = {
				scope: 'user_accounts:read,pins:read', // Missing pins:write
			};

			expect(() => validator.validateOperationPermissions(credentials, 'create', 'pin')).toThrow(
				NodeOperationError,
			);
		});

		it('should validate board read permissions', () => {
			const credentials = {
				scope: 'user_accounts:read,boards:read',
			};

			expect(() =>
				validator.validateOperationPermissions(credentials, 'get', 'board'),
			).not.toThrow();
		});

		it('should validate user profile permissions', () => {
			const credentials = {
				scope: 'user_accounts:read',
			};

			expect(() =>
				validator.validateOperationPermissions(credentials, 'getProfile', 'user'),
			).not.toThrow();
		});
	});

	describe('static methods', () => {
		it('should generate consistent credential hash', () => {
			const credentials = {
				clientId: '1234567890123456789',
				clientSecret: 'secret',
			};

			const hash1 = CredentialSecurityValidator.generateCredentialHash(credentials);
			const hash2 = CredentialSecurityValidator.generateCredentialHash(credentials);

			expect(hash1).toBe(hash2);
			expect(hash1).toMatch(/^pinterest_cred_[a-f0-9]{8}$/);
		});

		it('should generate different hashes for different credentials', () => {
			const credentials1 = { clientId: '1111111111111111111' };
			const credentials2 = { clientId: '2222222222222222222' };

			const hash1 = CredentialSecurityValidator.generateCredentialHash(credentials1);
			const hash2 = CredentialSecurityValidator.generateCredentialHash(credentials2);

			expect(hash1).not.toBe(hash2);
		});

		it('should perform secure string comparison', () => {
			const string1 = 'secret_value_123';
			const string2 = 'secret_value_123';
			const string3 = 'different_value_456';

			expect(CredentialSecurityValidator.secureCompare(string1, string2)).toBe(true);
			expect(CredentialSecurityValidator.secureCompare(string1, string3)).toBe(false);
		});

		it('should handle different length strings in secure comparison', () => {
			const short = 'short';
			const long = 'much_longer_string';

			expect(CredentialSecurityValidator.secureCompare(short, long)).toBe(false);
		});
	});

	describe('token validation edge cases', () => {
		it('should handle missing expiration data gracefully', () => {
			const tokenData = {
				access_token: 'valid_access_token_1234567890abcdef',
				// No expiration data
			};

			expect(() => validator['validateTokenExpiration'](tokenData)).not.toThrow();
		});

		it('should validate expires_in format', () => {
			const tokenData = {
				access_token: 'valid_access_token_1234567890abcdef',
				expires_in: 3600,
				issued_at: Math.floor(Date.now() / 1000),
			};

			expect(() => validator['validateTokenExpiration'](tokenData)).not.toThrow();
		});

		it('should detect suspiciously old tokens', () => {
			const tokenData = {
				access_token: 'valid_access_token_1234567890abcdef',
				expires_at: Math.floor(Date.now() / 1000) + 3600,
				issued_at: Math.floor(Date.now() / 1000) - 30 * 24 * 3600, // 30 days ago
			};

			// Should not throw but would log warning in real implementation
			expect(() => validator['validateTokenExpiration'](tokenData)).not.toThrow();
		});
	});

	describe('isValidTokenFormat', () => {
		it('should validate proper token format', () => {
			const validToken = 'abcdef1234567890_-ABCDEF';
			expect(validator['isValidTokenFormat'](validToken)).toBe(true);
		});

		it('should reject tokens that are too short', () => {
			const shortToken = 'short';
			expect(validator['isValidTokenFormat'](shortToken)).toBe(false);
		});

		it('should reject tokens that are too long', () => {
			const longToken = 'a'.repeat(501);
			expect(validator['isValidTokenFormat'](longToken)).toBe(false);
		});

		it('should reject tokens with invalid characters', () => {
			const invalidToken = 'token_with_invalid@characters!';
			expect(validator['isValidTokenFormat'](invalidToken)).toBe(false);
		});
	});

	describe('isWeakSecret', () => {
		it('should detect all same character secrets', () => {
			const weakSecret = 'aaaaaaaaaaaaaaaaaaaaaa';
			expect(validator['isWeakSecret'](weakSecret)).toBe(true);
		});

		it('should detect sequential patterns', () => {
			const weakSecrets = [
				'012345678901234567890123',
				'abcdefghijklmnopqrstuvwx',
				'123456789012345678901234',
			];

			weakSecrets.forEach((secret) => {
				expect(validator['isWeakSecret'](secret)).toBe(true);
			});
		});

		it('should detect common word patterns', () => {
			const weakSecrets = [
				'password1234567890123456',
				'secret1234567890123456789',
				'key1234567890123456789012',
			];

			weakSecrets.forEach((secret) => {
				expect(validator['isWeakSecret'](secret)).toBe(true);
			});
		});

		it('should accept strong secrets', () => {
			const strongSecret = 'Kj8#mP2$nQ9@vR5%wS1!xT7&';
			expect(validator['isWeakSecret'](strongSecret)).toBe(false);
		});
	});
});
