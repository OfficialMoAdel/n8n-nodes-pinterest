import { NodeOperationError, type INode, type ICredentialDataDecryptedObject } from 'n8n-workflow';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Credential Security Validator for Pinterest OAuth2 credentials
 * Validates credential security and implements secure storage practices
 */
export class CredentialSecurityValidator {
	private static readonly MIN_CLIENT_ID_LENGTH = 10;
	private static readonly MIN_CLIENT_SECRET_LENGTH = 20;
	private static readonly MAX_TOKEN_AGE_HOURS = 24; // Maximum age before warning
	private static readonly SUSPICIOUS_PATTERNS = [
		/test/i,
		/demo/i,
		/example/i,
		/placeholder/i,
		/your_client_id/i,
		/your_client_secret/i,
	];

	constructor(private node: INode) {}

	/**
	 * Validate Pinterest OAuth2 credentials for security compliance
	 */
	validateCredentials(credentials: ICredentialDataDecryptedObject): void {
		this.validateClientId(credentials.clientId as string);
		this.validateClientSecret(credentials.clientSecret as string);
		this.validateOAuthTokens(credentials.oauthTokenData as any);
		this.validateScopes(credentials.scope as string);
		this.checkForTestCredentials(credentials);
	}

	/**
	 * Validate Client ID format and security
	 */
	private validateClientId(clientId: string): void {
		if (!clientId || typeof clientId !== 'string') {
			throw new NodeOperationError(this.node, 'Pinterest Client ID is required');
		}

		if (clientId.length < CredentialSecurityValidator.MIN_CLIENT_ID_LENGTH) {
			throw new NodeOperationError(
				this.node,
				`Pinterest Client ID appears to be too short (minimum ${CredentialSecurityValidator.MIN_CLIENT_ID_LENGTH} characters)`,
			);
		}

		// Check for suspicious patterns
		for (const pattern of CredentialSecurityValidator.SUSPICIOUS_PATTERNS) {
			if (pattern.test(clientId)) {
				throw new NodeOperationError(
					this.node,
					'Pinterest Client ID appears to be a placeholder or test value. Please use your actual Pinterest app credentials.',
				);
			}
		}

		// Pinterest Client IDs should be numeric
		if (!/^\d+$/.test(clientId)) {
			throw new NodeOperationError(
				this.node,
				'Pinterest Client ID should contain only numbers. Please verify your Pinterest app configuration.',
			);
		}
	}

	/**
	 * Validate Client Secret format and security
	 */
	private validateClientSecret(clientSecret: string): void {
		if (!clientSecret || typeof clientSecret !== 'string') {
			throw new NodeOperationError(this.node, 'Pinterest Client Secret is required');
		}

		if (clientSecret.length < CredentialSecurityValidator.MIN_CLIENT_SECRET_LENGTH) {
			throw new NodeOperationError(
				this.node,
				`Pinterest Client Secret appears to be too short (minimum ${CredentialSecurityValidator.MIN_CLIENT_SECRET_LENGTH} characters)`,
			);
		}

		// Check for suspicious patterns
		for (const pattern of CredentialSecurityValidator.SUSPICIOUS_PATTERNS) {
			if (pattern.test(clientSecret)) {
				throw new NodeOperationError(
					this.node,
					'Pinterest Client Secret appears to be a placeholder or test value. Please use your actual Pinterest app credentials.',
				);
			}
		}

		// Check for common weak patterns
		if (this.isWeakSecret(clientSecret)) {
			throw new NodeOperationError(
				this.node,
				'Pinterest Client Secret appears to be weak or predictable. Please regenerate your Pinterest app secret.',
			);
		}
	}

	/**
	 * Validate OAuth token data
	 */
	private validateOAuthTokens(tokenData: any): void {
		if (!tokenData || typeof tokenData !== 'object') {
			throw new NodeOperationError(
				this.node,
				'OAuth token data is missing. Please reconnect your Pinterest account.',
			);
		}

		// Validate access token
		if (!tokenData.access_token || typeof tokenData.access_token !== 'string') {
			throw new NodeOperationError(
				this.node,
				'Pinterest access token is missing. Please reconnect your Pinterest account.',
			);
		}

		// Validate refresh token (if using continuous refresh)
		if (tokenData.refresh_token && typeof tokenData.refresh_token !== 'string') {
			throw new NodeOperationError(
				this.node,
				'Pinterest refresh token is invalid. Please reconnect your Pinterest account.',
			);
		}

		// Check token expiration
		this.validateTokenExpiration(tokenData);

		// Validate token format (Pinterest tokens are typically long alphanumeric strings)
		if (!this.isValidTokenFormat(tokenData.access_token)) {
			throw new NodeOperationError(
				this.node,
				'Pinterest access token format appears invalid. Please reconnect your Pinterest account.',
			);
		}
	}

	/**
	 * Validate OAuth scopes for security compliance
	 */
	private validateScopes(scope: string): void {
		if (!scope || typeof scope !== 'string') {
			throw new NodeOperationError(this.node, 'Pinterest OAuth scopes are missing');
		}

		const scopes = scope.split(',').map((s) => s.trim());
		const requiredScopes = ['user_accounts:read'];
		const recommendedScopes = ['boards:read', 'boards:write', 'pins:read', 'pins:write'];

		// Check for required scopes
		for (const requiredScope of requiredScopes) {
			if (!scopes.includes(requiredScope)) {
				throw new NodeOperationError(
					this.node,
					`Missing required Pinterest scope: ${requiredScope}. Please update your Pinterest app configuration.`,
				);
			}
		}

		// Warn about missing recommended scopes
		const missingRecommended = recommendedScopes.filter((scope) => !scopes.includes(scope));
		if (missingRecommended.length > 0) {
			// Note: In a real implementation, this might be logged as a warning
			// For now, we'll allow it but could add to audit log
		}

		// Check for overly broad scopes that might indicate security risk
		const dangerousScopes = scopes.filter(
			(scope) => scope.includes('write') && !scope.includes('pins') && !scope.includes('boards'),
		);

		if (dangerousScopes.length > 0) {
			// Log potential security concern but don't block
			// This would be logged in audit log in real implementation
		}
	}

	/**
	 * Check for test or placeholder credentials
	 */
	private checkForTestCredentials(credentials: ICredentialDataDecryptedObject): void {
		const clientId = credentials.clientId as string;
		const clientSecret = credentials.clientSecret as string;

		// Common test credential patterns
		const testPatterns = [
			'123456789',
			'test_client_id',
			'demo_client_secret',
			'your_app_id',
			'placeholder',
		];

		for (const pattern of testPatterns) {
			if (clientId?.includes(pattern) || clientSecret?.includes(pattern)) {
				throw new NodeOperationError(
					this.node,
					'Test or placeholder credentials detected. Please use your actual Pinterest app credentials from https://developers.pinterest.com/apps/',
				);
			}
		}

		// Check for matching client ID and secret (security anti-pattern)
		if (clientId && clientSecret && clientId === clientSecret) {
			throw new NodeOperationError(
				this.node,
				'Client ID and Client Secret cannot be the same. Please check your Pinterest app configuration.',
			);
		}
	}

	/**
	 * Validate token expiration and freshness
	 */
	private validateTokenExpiration(tokenData: any): void {
		if (!tokenData.expires_at && !tokenData.expires_in) {
			// No expiration data available, skip validation
			return;
		}

		let expirationTime: number;

		if (tokenData.expires_at) {
			expirationTime =
				typeof tokenData.expires_at === 'number'
					? tokenData.expires_at
					: parseInt(tokenData.expires_at);
		} else if (tokenData.expires_in) {
			// Calculate expiration from issued time
			const issuedAt = tokenData.issued_at || Date.now() / 1000;
			expirationTime = issuedAt + tokenData.expires_in;
		} else {
			return;
		}

		const now = Date.now() / 1000;
		const timeUntilExpiry = expirationTime - now;

		// Check if token is expired
		if (timeUntilExpiry <= 0) {
			throw new NodeOperationError(
				this.node,
				'Pinterest access token has expired. Please reconnect your Pinterest account.',
			);
		}

		// Warn if token expires soon (less than 1 hour)
		if (timeUntilExpiry < 3600) {
			// In a real implementation, this would be logged as a warning
			// The OAuth2 flow should handle automatic refresh
		}

		// Check for suspiciously old tokens
		const tokenAge = now - (tokenData.issued_at || now);
		const maxAgeSeconds = CredentialSecurityValidator.MAX_TOKEN_AGE_HOURS * 3600;

		if (tokenAge > maxAgeSeconds) {
			// Log potential security concern - very old token
			// This might indicate the token hasn't been refreshed properly
		}
	}

	/**
	 * Check if client secret appears weak
	 */
	private isWeakSecret(secret: string): boolean {
		// Check for common weak patterns
		const weakPatterns = [
			/^(.)\1+$/, // All same character
			/^(012|123|234|345|456|567|678|789|890|abc|def)/i, // Sequential
			/^(password|secret|key|token)/i, // Common words
			/^[a-z]+$/i, // Only letters
			/^\d+$/, // Only numbers
		];

		return weakPatterns.some((pattern) => pattern.test(secret));
	}

	/**
	 * Validate Pinterest token format
	 */
	private isValidTokenFormat(token: string): boolean {
		// Pinterest access tokens are typically long alphanumeric strings
		// This is a basic format check - actual validation happens with Pinterest API
		return token.length >= 20 && token.length <= 500 && /^[a-zA-Z0-9_-]+$/.test(token);
	}

	/**
	 * Generate credential security hash for audit logging
	 */
	static generateCredentialHash(credentials: ICredentialDataDecryptedObject): string {
		const clientId = credentials.clientId as string;
		const hashedId = createHash('sha256')
			.update(clientId || 'unknown')
			.digest('hex')
			.substring(0, 8);

		return `pinterest_cred_${hashedId}`;
	}

	/**
	 * Validate credential permissions for specific operations
	 */
	validateOperationPermissions(
		credentials: ICredentialDataDecryptedObject,
		operation: string,
		resource: string,
	): void {
		const scope = credentials.scope as string;
		if (!scope) {
			throw new NodeOperationError(this.node, 'No OAuth scopes available');
		}

		const scopes = scope.split(',').map((s) => s.trim());
		const requiredScope = this.getRequiredScope(operation, resource);

		if (requiredScope && !scopes.includes(requiredScope)) {
			throw new NodeOperationError(
				this.node,
				`Insufficient permissions for ${operation} ${resource}. Required scope: ${requiredScope}. Please reconnect your Pinterest account with the necessary permissions.`,
			);
		}
	}

	/**
	 * Get required scope for operation
	 */
	private getRequiredScope(operation: string, resource: string): string | null {
		const scopeMap: Record<string, Record<string, string>> = {
			pin: {
				create: 'pins:write',
				update: 'pins:write',
				delete: 'pins:write',
				get: 'pins:read',
			},
			board: {
				create: 'boards:write',
				update: 'boards:write',
				delete: 'boards:write',
				get: 'boards:read',
			},
			user: {
				getProfile: 'user_accounts:read',
				getAnalytics: 'user_accounts:read',
			},
		};

		return scopeMap[resource]?.[operation] || null;
	}

	/**
	 * Secure comparison of credential values
	 */
	static secureCompare(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false;
		}

		const bufferA = Buffer.from(a, 'utf8');
		const bufferB = Buffer.from(b, 'utf8');

		return timingSafeEqual(bufferA, bufferB);
	}
}
