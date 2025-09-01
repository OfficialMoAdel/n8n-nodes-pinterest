import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PinterestOAuth2Api implements ICredentialType {
	name = 'pinterestOAuth2Api';

	displayName = 'Pinterest OAuth2 API';

	documentationUrl = 'https://developers.pinterest.com/docs/getting-started/authentication/';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://www.pinterest.com/oauth/',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.pinterest.com/v5/oauth/token',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			required: true,
			default: '',
			description: 'The Client ID from your Pinterest app configuration',
			placeholder: 'e.g., 1234567890123456789',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'The Client Secret from your Pinterest app configuration',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'user_accounts:read,boards:read,boards:write,boards:read_secret,boards:write_secret,pins:read,pins:write,pins:read_secret,pins:write_secret',
		},
		{
			displayName: 'Use Continuous Refresh',
			name: 'continuousRefresh',
			type: 'boolean',
			default: true,
			description:
				"Enable continuous refresh tokens (60-day expiration cycle). Recommended to comply with Pinterest's September 25, 2025 deprecation of legacy tokens.",
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'oAuth2',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.oauthTokenData.access_token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.pinterest.com/v5',
			url: '/user_account',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'username',
					value: 'username',
					message:
						'Pinterest credentials are valid. Connected to account: {{$responseItem.username}}',
				},
			},
		],
	};
}
