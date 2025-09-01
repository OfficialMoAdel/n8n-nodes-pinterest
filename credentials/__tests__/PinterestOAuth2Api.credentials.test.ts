import { PinterestOAuth2Api } from '../PinterestOAuth2Api.credentials';
import type { ICredentialTestRequest, INodeProperties } from 'n8n-workflow';

describe('PinterestOAuth2Api Credentials', () => {
	let credentials: PinterestOAuth2Api;

	beforeEach(() => {
		credentials = new PinterestOAuth2Api();
	});

	describe('Credential Configuration', () => {
		it('should have correct name and display name', () => {
			expect(credentials.name).toBe('pinterestOAuth2Api');
			expect(credentials.displayName).toBe('Pinterest OAuth2 API');
		});

		it('should have correct documentation URL', () => {
			expect(credentials.documentationUrl).toBe(
				'https://developers.pinterest.com/docs/getting-started/authentication/',
			);
		});

		it('should have proper documentation URL', () => {
			expect(credentials.documentationUrl).toBe(
				'https://developers.pinterest.com/docs/getting-started/authentication/',
			);
		});
	});

	describe('OAuth2 Properties', () => {
		let properties: INodeProperties[];

		beforeEach(() => {
			properties = credentials.properties;
		});

		it('should have grant type set to authorization code', () => {
			const grantType = properties.find((prop) => prop.name === 'grantType');
			expect(grantType).toBeDefined();
			expect(grantType?.default).toBe('authorizationCode');
			expect(grantType?.type).toBe('hidden');
		});

		it('should have correct authorization URL', () => {
			const authUrl = properties.find((prop) => prop.name === 'authUrl');
			expect(authUrl).toBeDefined();
			expect(authUrl?.default).toBe('https://www.pinterest.com/oauth/');
			expect(authUrl?.type).toBe('hidden');
		});

		it('should have correct access token URL', () => {
			const accessTokenUrl = properties.find((prop) => prop.name === 'accessTokenUrl');
			expect(accessTokenUrl).toBeDefined();
			expect(accessTokenUrl?.default).toBe('https://api.pinterest.com/v5/oauth/token');
			expect(accessTokenUrl?.type).toBe('hidden');
		});

		it('should require client ID with proper configuration', () => {
			const clientId = properties.find((prop) => prop.name === 'clientId');
			expect(clientId).toBeDefined();
			expect(clientId?.required).toBe(true);
			expect(clientId?.type).toBe('string');
			expect(clientId?.displayName).toBe('Client ID');
			expect(clientId?.description).toBe('The Client ID from your Pinterest app configuration');
		});

		it('should require client secret with password type', () => {
			const clientSecret = properties.find((prop) => prop.name === 'clientSecret');
			expect(clientSecret).toBeDefined();
			expect(clientSecret?.required).toBe(true);
			expect(clientSecret?.type).toBe('string');
			expect(clientSecret?.typeOptions).toEqual({ password: true });
			expect(clientSecret?.displayName).toBe('Client Secret');
			expect(clientSecret?.description).toBe(
				'The Client Secret from your Pinterest app configuration',
			);
		});
	});

	describe('Scope Configuration', () => {
		it('should include comprehensive Pinterest scopes including secret content access', () => {
			const scope = credentials.properties.find((prop) => prop.name === 'scope');
			expect(scope).toBeDefined();
			expect(scope?.type).toBe('hidden');

			const scopeValue = scope?.default as string;
			expect(scopeValue).toContain('user_accounts:read');
			expect(scopeValue).toContain('boards:read');
			expect(scopeValue).toContain('boards:write');
			expect(scopeValue).toContain('boards:read_secret');
			expect(scopeValue).toContain('boards:write_secret');
			expect(scopeValue).toContain('pins:read');
			expect(scopeValue).toContain('pins:write');
			expect(scopeValue).toContain('pins:read_secret');
			expect(scopeValue).toContain('pins:write_secret');
		});
	});

	describe('Continuous Refresh Configuration', () => {
		it('should enable continuous refresh by default', () => {
			const continuousRefresh = credentials.properties.find(
				(prop) => prop.name === 'continuousRefresh',
			);
			expect(continuousRefresh).toBeDefined();
			expect(continuousRefresh?.type).toBe('boolean');
			expect(continuousRefresh?.default).toBe(true);
			expect(continuousRefresh?.displayName).toBe('Use Continuous Refresh');
		});

		it('should have proper description about September 2025 deprecation', () => {
			const continuousRefresh = credentials.properties.find(
				(prop) => prop.name === 'continuousRefresh',
			);
			expect(continuousRefresh?.description).toContain('60-day expiration cycle');
			expect(continuousRefresh?.description).toContain('September 25, 2025');
			expect(continuousRefresh?.description).toContain('deprecation');
		});
	});

	describe('Authentication Configuration', () => {
		it('should use generic authentication with Bearer token', () => {
			expect(credentials.authenticate.type).toBe('generic');
			expect(credentials.authenticate.properties.headers).toBeDefined();
			const headers = credentials.authenticate.properties.headers as any;
			expect(headers.Authorization).toBe('=Bearer {{$credentials.oauthTokenData.access_token}}');
		});
	});

	describe('Credential Testing', () => {
		let testConfig: ICredentialTestRequest;

		beforeEach(() => {
			testConfig = credentials.test;
		});

		it('should test credentials against user account endpoint', () => {
			expect(testConfig.request.baseURL).toBe('https://api.pinterest.com/v5');
			expect(testConfig.request.url).toBe('/user_account');
			expect(testConfig.request.method).toBe('GET');
		});

		it('should have success validation rule for username', () => {
			expect(testConfig.rules).toBeDefined();
			expect(testConfig.rules).toHaveLength(1);

			const rule = testConfig.rules![0];
			expect(rule.type).toBe('responseSuccessBody');
			const properties = rule.properties as any;
			expect(properties.key).toBe('username');
			expect(properties.value).toBe('username');
			expect(properties.message).toContain('Pinterest credentials are valid');
			expect(properties.message).toContain('{{$responseItem.username}}');
		});
	});

	describe('Token Refresh Validation', () => {
		it('should support automatic token refresh through n8n OAuth2 flow', () => {
			// Verify that the credential is configured for OAuth2 which handles refresh automatically
			const grantType = credentials.properties.find((prop) => prop.name === 'grantType');
			expect(grantType?.default).toBe('authorizationCode');

			const accessTokenUrl = credentials.properties.find((prop) => prop.name === 'accessTokenUrl');
			expect(accessTokenUrl?.default).toBe('https://api.pinterest.com/v5/oauth/token');
		});

		it('should have continuous refresh enabled by default for 60-day cycle', () => {
			const continuousRefresh = credentials.properties.find(
				(prop) => prop.name === 'continuousRefresh',
			);
			expect(continuousRefresh?.default).toBe(true);
		});
	});

	describe('Security Validation', () => {
		it('should mark client secret as password type for secure storage', () => {
			const clientSecret = credentials.properties.find((prop) => prop.name === 'clientSecret');
			expect(clientSecret?.typeOptions?.password).toBe(true);
		});

		it('should use Bearer token authentication for API requests', () => {
			const headers = credentials.authenticate.properties.headers as any;
			expect(headers.Authorization).toContain('Bearer');
			expect(headers.Authorization).toContain('access_token');
		});

		it('should not expose sensitive information in hidden fields', () => {
			const hiddenFields = credentials.properties.filter((prop) => prop.type === 'hidden');
			hiddenFields.forEach((field) => {
				expect(['grantType', 'authUrl', 'accessTokenUrl', 'scope', 'authentication']).toContain(
					field.name,
				);
			});
		});
	});
});
