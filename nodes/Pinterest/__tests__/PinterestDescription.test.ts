import { PinterestDescription } from '../PinterestDescription';
import type { INodeTypeDescription, INodePropertyOptions } from 'n8n-workflow';

/**
 * Test suite for Pinterest Node Description UI elements
 * Tests dynamic field visibility, validation, tooltips, and user experience
 */
describe('PinterestDescription', () => {
	let description: INodeTypeDescription;

	beforeEach(() => {
		description = PinterestDescription;
	});

	describe('Basic Node Configuration', () => {
		it('should have correct basic node properties', () => {
			expect(description.displayName).toBe('Pinterest');
			expect(description.name).toBe('pinterest');
			expect(description.group).toEqual(['transform']);
			expect(description.version).toBe(1);
		});

		it('should have correct credentials configuration', () => {
			expect(description.credentials).toHaveLength(1);
			expect(description.credentials![0].name).toBe('pinterestOAuth2Api');
			expect(description.credentials![0].required).toBe(true);
		});

		it('should have correct API defaults', () => {
			expect(description.requestDefaults?.baseURL).toBe('https://api.pinterest.com/v5');
			expect(description.requestDefaults?.headers).toEqual({
				Accept: 'application/json',
				'Content-Type': 'application/json',
			});
		});
	});

	describe('Resource Selection', () => {
		it('should have all required resources', () => {
			const resourceField = description.properties.find((p) => p.name === 'resource');
			expect(resourceField).toBeDefined();
			expect(resourceField?.type).toBe('options');

			const options = (resourceField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(5);

			const resourceValues = options.map((opt) => opt.value);
			expect(resourceValues).toEqual(['board', 'media', 'pin', 'search', 'user']);
		});

		it('should have descriptive resource options', () => {
			const resourceField = description.properties.find((p) => p.name === 'resource');
			const options = (resourceField as any)?.options as INodePropertyOptions[];

			options.forEach((option) => {
				expect(option.description).toBeDefined();
				expect(option.description?.length).toBeGreaterThan(10);
			});
		});
	});

	describe('Pin Operations', () => {
		it('should have all pin operations', () => {
			const operationField = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('pin'),
			);

			expect(operationField).toBeDefined();
			const options = (operationField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(5);

			const operationValues = options.map((opt) => opt.value);
			expect(operationValues).toEqual(['bulk', 'create', 'delete', 'get', 'update']);
		});

		it('should have proper field visibility for pin create operation', () => {
			const boardIdField = description.properties.find(
				(p) => p.name === 'boardId' && p.displayOptions?.show?.resource?.includes('pin'),
			);

			expect(boardIdField).toBeDefined();
			expect(boardIdField?.displayOptions?.show?.operation).toContain('create');
			expect(boardIdField?.required).toBe(true);
		});

		it('should have media source selection for pin create', () => {
			const mediaSourceField = description.properties.find((p) => p.name === 'mediaSource');
			expect(mediaSourceField).toBeDefined();
			expect(mediaSourceField?.type).toBe('options');

			const options = (mediaSourceField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(2);
			expect(options.map((opt) => opt.value)).toEqual(['url', 'upload']);
		});

		it('should have conditional media URL field', () => {
			const mediaUrlField = description.properties.find((p) => p.name === 'mediaUrl');
			expect(mediaUrlField).toBeDefined();
			expect(mediaUrlField?.displayOptions?.show?.mediaSource).toContain('url');
			expect(mediaUrlField?.required).toBe(true);
		});

		it('should have conditional binary property field', () => {
			const binaryField = description.properties.find(
				(p) =>
					p.name === 'binaryPropertyName' &&
					p.displayOptions?.show?.mediaSource?.includes('upload'),
			);
			expect(binaryField).toBeDefined();
			expect(binaryField?.required).toBe(true);
		});
	});

	describe('Board Operations', () => {
		it('should have all board operations', () => {
			const operationField = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('board'),
			);

			expect(operationField).toBeDefined();
			const options = (operationField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(5);

			const operationValues = options.map((opt) => opt.value);
			expect(operationValues).toEqual(['create', 'get', 'update', 'delete', 'bulk']);
		});

		it('should have privacy options for board creation', () => {
			const privacyField = description.properties.find((p) => p.name === 'privacy');
			expect(privacyField).toBeDefined();
			expect(privacyField?.type).toBe('options');

			const options = (privacyField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(3);
			expect(options.map((opt) => opt.value)).toEqual(['public', 'protected', 'secret']);
		});
	});

	describe('User Operations', () => {
		it('should have all user operations', () => {
			const operationField = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('user'),
			);

			expect(operationField).toBeDefined();
			const options = (operationField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(4);

			const operationValues = options.map((opt) => opt.value);
			expect(operationValues).toEqual([
				'getProfile',
				'getAnalytics',
				'getPinAnalytics',
				'getBoardAnalytics',
			]);
		});

		it('should have analytics date fields', () => {
			const startDateField = description.properties.find((p) => p.name === 'startDate');
			const endDateField = description.properties.find((p) => p.name === 'endDate');

			expect(startDateField).toBeDefined();
			expect(endDateField).toBeDefined();
			expect(startDateField?.type).toBe('dateTime');
			expect(endDateField?.type).toBe('dateTime');
		});
	});

	describe('Search Operations', () => {
		it('should have all search operations', () => {
			const operationField = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('search'),
			);

			expect(operationField).toBeDefined();
			const options = (operationField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(3);

			const operationValues = options.map((opt) => opt.value);
			expect(operationValues).toEqual(['pins', 'boards', 'trending']);
		});

		it('should have search query field with validation', () => {
			const queryField = description.properties.find(
				(p) => p.name === 'query' && p.displayOptions?.show?.resource?.includes('search'),
			);

			expect(queryField).toBeDefined();
			expect(queryField?.required).toBe(true);
			expect(queryField?.typeOptions?.minLength).toBe(2);
			expect(queryField?.typeOptions?.maxLength).toBe(100);
		});
	});

	describe('Media Operations', () => {
		it('should have media upload operation', () => {
			const operationField = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('media'),
			);

			expect(operationField).toBeDefined();
			const options = (operationField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(1);
			expect(options[0].value).toBe('upload');
		});

		it('should have media type selection', () => {
			const mediaTypeField = description.properties.find((p) => p.name === 'mediaType');
			expect(mediaTypeField).toBeDefined();
			expect(mediaTypeField?.type).toBe('options');

			const options = (mediaTypeField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(2);
			expect(options.map((opt) => opt.value)).toEqual(['image', 'video']);
		});
	});

	describe('Field Validation', () => {
		it('should have URL validation for media URLs', () => {
			const mediaUrlField = description.properties.find((p) => p.name === 'mediaUrl');
			expect(mediaUrlField?.typeOptions?.validation).toBeDefined();

			const validation = mediaUrlField?.typeOptions?.validation?.[0];
			expect(validation?.type).toBe('regex');
			expect(validation?.properties?.regex).toContain('https?://');
		});

		it('should have ID validation for Pinterest IDs', () => {
			const pinIdField = description.properties.find(
				(p) => p.name === 'pinId' && p.displayOptions?.show?.resource?.includes('pin'),
			);

			expect(pinIdField?.typeOptions?.validation).toBeDefined();
			const validation = pinIdField?.typeOptions?.validation?.[0];
			expect(validation?.type).toBe('regex');
			expect(validation?.properties?.regex).toBe('^[0-9]{10,20}$');
		});

		it('should have board name length validation', () => {
			const nameField = description.properties.find(
				(p) => p.name === 'name' && p.displayOptions?.show?.resource?.includes('board'),
			);

			expect(nameField?.typeOptions?.minLength).toBe(1);
			expect(nameField?.typeOptions?.maxLength).toBe(180);
		});
	});

	describe('User Experience Elements', () => {
		it('should have helpful hints for complex fields', () => {
			const boardIdField = description.properties.find(
				(p) => p.name === 'boardId' && p.displayOptions?.show?.resource?.includes('pin'),
			);

			expect(boardIdField?.hint).toBeDefined();
			expect(boardIdField?.hint).toContain('Board IDs are typically 18-digit numbers');
		});

		it('should have informational notices for operations', () => {
			const pinContentNotice = description.properties.find((p) => p.name === 'pinContentNotice');
			expect(pinContentNotice).toBeDefined();
			expect(pinContentNotice?.type).toBe('notice');
			expect(pinContentNotice?.typeOptions?.theme).toBe('info');
		});

		it('should have warning notices for analytics', () => {
			const analyticsNotice = description.properties.find(
				(p) => p.name === 'analyticsConfigNotice',
			);
			expect(analyticsNotice).toBeDefined();
			expect(analyticsNotice?.type).toBe('notice');
			expect(analyticsNotice?.typeOptions?.theme).toBe('warning');
		});

		it('should have placeholders for input fields', () => {
			const mediaUrlField = description.properties.find((p) => p.name === 'mediaUrl');
			expect(mediaUrlField?.placeholder).toBe('https://example.com/image.jpg');

			const queryField = description.properties.find(
				(p) => p.name === 'query' && p.displayOptions?.show?.resource?.includes('search'),
			);
			expect(queryField?.placeholder).toBe('Enter search terms...');
		});
	});

	describe('Advanced Options', () => {
		it('should have return all fields option', () => {
			const returnAllField = description.properties.find((p) => p.name === 'returnAllFields');
			expect(returnAllField).toBeDefined();
			expect(returnAllField?.type).toBe('boolean');
			expect(returnAllField?.default).toBe(false);
		});

		it('should have simplify output option', () => {
			const simplifyField = description.properties.find((p) => p.name === 'simplifyOutput');
			expect(simplifyField).toBeDefined();
			expect(simplifyField?.type).toBe('boolean');
			expect(simplifyField?.default).toBe(true);
		});
	});

	describe('Bulk Operations', () => {
		it('should have bulk operation types', () => {
			const bulkTypeField = description.properties.find((p) => p.name === 'bulkOperationType');
			expect(bulkTypeField).toBeDefined();
			expect(bulkTypeField?.type).toBe('options');

			const options = (bulkTypeField as any)?.options as INodePropertyOptions[];
			expect(options).toHaveLength(3);
			expect(options.map((opt) => opt.value)).toEqual([
				'getMultiple',
				'updateMultiple',
				'deleteMultiple',
			]);
		});

		it('should have bulk operations notice', () => {
			const bulkNotice = description.properties.find((p) => p.name === 'bulkOperationsNotice');
			expect(bulkNotice).toBeDefined();
			expect(bulkNotice?.type).toBe('notice');
			expect(bulkNotice?.typeOptions?.theme).toBe('warning');
		});
	});
});

/**
 * Integration tests for UI field interactions
 */
describe('PinterestDescription UI Interactions', () => {
	let description: INodeTypeDescription;

	beforeEach(() => {
		description = PinterestDescription;
	});

	describe('Dynamic Field Visibility', () => {
		it('should show correct fields for pin create operation', () => {
			const pinCreateFields = description.properties.filter(
				(p) =>
					p.displayOptions?.show?.resource?.includes('pin') &&
					p.displayOptions?.show?.operation?.includes('create'),
			);

			const fieldNames = pinCreateFields.map((f) => f.name);
			expect(fieldNames).toContain('boardId');
			expect(fieldNames).toContain('mediaSource');
			expect(fieldNames).toContain('title');
			expect(fieldNames).toContain('description');
		});

		it('should show media URL field only when URL source is selected', () => {
			const mediaUrlField = description.properties.find((p) => p.name === 'mediaUrl');
			expect(mediaUrlField?.displayOptions?.show?.mediaSource).toEqual(['url']);
		});

		it('should show binary property field only when upload source is selected', () => {
			const binaryField = description.properties.find(
				(p) =>
					p.name === 'binaryPropertyName' &&
					p.displayOptions?.show?.mediaSource?.includes('upload'),
			);
			expect(binaryField?.displayOptions?.show?.mediaSource).toEqual(['upload']);
		});

		it('should show analytics fields only for analytics operations', () => {
			const analyticsFields = description.properties.filter((p) =>
				p.displayOptions?.show?.operation?.some((op) =>
					['getAnalytics', 'getPinAnalytics', 'getBoardAnalytics'].includes(op as string),
				),
			);

			expect(analyticsFields.length).toBeGreaterThan(0);

			const fieldNames = analyticsFields.map((f) => f.name);
			expect(fieldNames).toContain('startDate');
			expect(fieldNames).toContain('endDate');
		});
	});

	describe('Field Dependencies', () => {
		it('should have proper resource-operation dependencies', () => {
			const operationFields = description.properties.filter((p) => p.name === 'operation');

			operationFields.forEach((field) => {
				expect(field.displayOptions?.show?.resource).toBeDefined();
				expect(field.displayOptions?.show?.resource?.length).toBeGreaterThan(0);
			});
		});

		it('should have proper operation-field dependencies', () => {
			const operationSpecificFields = description.properties.filter(
				(p) => p.displayOptions?.show?.operation && p.name !== 'operation',
			);

			operationSpecificFields.forEach((field) => {
				expect(field.displayOptions?.show?.operation?.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Validation Messages', () => {
		it('should have meaningful error messages for validation failures', () => {
			const fieldsWithValidation = description.properties.filter(
				(p) => p.typeOptions?.validation && p.typeOptions.validation.length > 0,
			);

			fieldsWithValidation.forEach((field) => {
				const validation = field.typeOptions?.validation?.[0];
				expect(validation?.properties?.errorMessage).toBeDefined();
				expect(validation?.properties?.errorMessage?.length).toBeGreaterThan(10);
			});
		});
	});
});
