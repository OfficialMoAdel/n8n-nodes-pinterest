/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: './.eslintrc.js',

	overrides: [
		{
			files: ['package.json'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			rules: {
				'n8n-nodes-base/community-package-json-name-still-default': 'error',
				'n8n-nodes-base/community-package-json-author-email-still-default': 'error',
				'n8n-nodes-base/community-package-json-repository-url-still-default': 'error',
			},
		},
		{
			files: ['./nodes/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			rules: {
				// Basic production rules - keep it simple
				'no-console': 'warn', // Allow console for now, just warn
				'no-debugger': 'error',
			},
		},
		{
			files: ['./credentials/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			rules: {
				// Basic production rules - keep it simple
				'no-console': 'warn', // Allow console for now, just warn
				'no-debugger': 'error',
			},
		},
	],
};
