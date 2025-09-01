import { PinterestDescription } from '../PinterestDescription';
import type { INodeTypeDescription, INodePropertyOptions } from 'n8n-workflow';

/**
 * Integration tests for Pinterest Node UI interactions
 * Tests realistic user scenarios and field interactions
 */
describe('Pinterest Node UI Integration', () => {
	let description: INodeTypeDescription;

	beforeEach(() => {
		description = PinterestDescription;
	});

	describe('User Workflow Scenarios', () => {
		it('should support complete pin creation workflow', () => {
			// User selects pin resource
			const resourceField = description.properties.find((p) => p.name === 'resource');
			const resourceOptions = (resourceField as any)?.options as INodePropertyOptions[];
			expect(resourceOptions?.some((opt) => opt.value === 'pin')).toBe(true);

			// User selects create operation
			const pinOperationField = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('pin'),
			);
			const pinOperationOptions = (pinOperationField as any)?.options as INodePropertyOptions[];
			expect(pinOperationOptions?.some((opt) => opt.value === 'create')).toBe(true);

			// User sees board ID field (required)
			const boardIdField = description.properties.find(
				(p) =>
					p.name === 'boardId' &&
					p.displayOptions?.show?.resource?.includes('pin') &&
					p.displayOptions?.show?.operation?.includes('create'),
			);
			expect(boardIdField).toBeDefined();
			expect(boardIdField?.required).toBe(true);

			// User sees media source selection
			const mediaSourceField = description.properties.find((p) => p.name === 'mediaSource');
			expect(mediaSourceField).toBeDefined();
			expect(mediaSourceField?.required).toBe(true);

			// User selects URL source and sees URL field
			const mediaUrlField = description.properties.find(
				(p) => p.name === 'mediaUrl' && p.displayOptions?.show?.mediaSource?.includes('url'),
			);
			expect(mediaUrlField).toBeDefined();
			expect(mediaUrlField?.required).toBe(true);

			// User sees optional content fields
			const titleField = description.properties.find(
				(p) =>
					p.name === 'title' &&
					p.displayOptions?.show?.resource?.includes('pin') &&
					p.displayOptions?.show?.operation?.includes('create'),
			);
			expect(titleField).toBeDefined();
			expect(titleField?.required).toBeFalsy();
		});

		it('should support board creation workflow', () => {
			// User selects board resource
			const resourceField = description.properties.find((p) => p.name === 'resource');
			const resourceOptions = (resourceField as any)?.options as INodePropertyOptions[];
			expect(resourceOptions?.some((opt) => opt.value === 'board')).toBe(true);

			// User selects create operation
			const boardOperationField = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('board'),
			);
			const boardOperationOptions = (boardOperationField as any)?.options as INodePropertyOptions[];
			expect(boardOperationOptions?.some((opt) => opt.value === 'create')).toBe(true);

			// User sees required board name field
			const nameField = description.properties.find(
				(p) =>
					p.name === 'name' &&
					p.displayOptions?.show?.resource?.includes('board') &&
					p.displayOptions?.show?.operation?.includes('create'),
			);
			expect(nameField).toBeDefined();
			expect(nameField?.required).toBe(true);

			// User sees privacy options
			const privacyField = description.properties.find(
				(p) => p.name === 'privacy' && p.displayOptions?.show?.resource?.includes('board'),
			);
			expect(privacyField).toBeDefined();
			const privacyOptions = (privacyField as any)?.options as INodePropertyOptions[];
			expect(privacyOptions?.length).toBe(3);
		});

		it('should support analytics workflow', () => {
			// User selects user resource
			const resourceField = description.properties.find((p) => p.name === 'resource');
			const resourceOptions = (resourceField as any)?.options as INodePropertyOptions[];
			expect(resourceOptions?.some((opt) => opt.value === 'user')).toBe(true);

			// User selects pin analytics operation
			const userOperationField = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('user'),
			);
			const userOperationOptions = (userOperationField as any)?.options as INodePropertyOptions[];
			expect(userOperationOptions?.some((opt) => opt.value === 'getPinAnalytics')).toBe(true);

			// User sees required pin ID field for pin analytics
			const pinIdField = description.properties.find(
				(p) =>
					p.name === 'pinId' &&
					p.displayOptions?.show?.resource?.includes('user') &&
					p.displayOptions?.show?.operation?.includes('getPinAnalytics'),
			);
			expect(pinIdField).toBeDefined();
			expect(pinIdField?.required).toBe(true);

			// User sees optional date range fields
			const startDateField = description.properties.find(
				(p) => p.name === 'startDate' && p.displayOptions?.show?.resource?.includes('user'),
			);
			expect(startDateField).toBeDefined();
			expect(startDateField?.required).toBeFalsy();
		});

		it('should support search workflow', () => {
			// User selects search resource
			const resourceField = description.properties.find((p) => p.name === 'resource');
			const resourceOptions = (resourceField as any)?.options as INodePropertyOptions[];
			expect(resourceOptions?.some((opt) => opt.value === 'search')).toBe(true);

			// User selects pins search operation
			const searchOperationField = description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('search'),
			);
			const searchOperationOptions = (searchOperationField as any)
				?.options as INodePropertyOptions[];
			expect(searchOperationOptions?.some((opt) => opt.value === 'pins')).toBe(true);

			// User sees required query field
			const queryField = description.properties.find(
				(p) => p.name === 'query' && p.displayOptions?.show?.resource?.includes('search'),
			);
			expect(queryField).toBeDefined();
			expect(queryField?.required).toBe(true);

			// User sees optional limit field
			const limitField = description.properties.find(
				(p) => p.name === 'limit' && p.displayOptions?.show?.resource?.includes('search'),
			);
			expect(limitField).toBeDefined();
			expect(limitField?.required).toBeFalsy();
		});
	});

	describe('Field Validation Scenarios', () => {
		it('should validate Pinterest ID format', () => {
			const pinIdField = description.properties.find(
				(p) => p.name === 'pinId' && p.displayOptions?.show?.resource?.includes('pin'),
			);

			const validation = pinIdField?.typeOptions?.validation?.[0];
			expect(validation?.type).toBe('regex');

			// Test the regex pattern
			const regex = new RegExp(validation?.properties?.regex || '');
			expect(regex.test('123456789012345678')).toBe(true); // Valid 18-digit ID
			expect(regex.test('12345')).toBe(false); // Too short
			expect(regex.test('abc123')).toBe(false); // Contains letters
		});

		it('should validate media URL format', () => {
			const mediaUrlField = description.properties.find((p) => p.name === 'mediaUrl');
			const validation = mediaUrlField?.typeOptions?.validation?.[0];
			expect(validation?.type).toBe('regex');

			// Test the regex pattern
			const regex = new RegExp(validation?.properties?.regex || '');
			expect(regex.test('https://example.com/image.jpg')).toBe(true);
			expect(regex.test('http://example.com/video.mp4')).toBe(true);
			expect(regex.test('https://example.com/file.txt')).toBe(false); // Invalid extension
			expect(regex.test('ftp://example.com/image.jpg')).toBe(false); // Invalid protocol
		});

		it('should validate search query length', () => {
			const queryField = description.properties.find(
				(p) => p.name === 'query' && p.displayOptions?.show?.resource?.includes('search'),
			);

			expect(queryField?.typeOptions?.minLength).toBe(2);
			expect(queryField?.typeOptions?.maxLength).toBe(100);

			const validation = queryField?.typeOptions?.validation?.[0];
			const regex = new RegExp(validation?.properties?.regex || '');
			expect(regex.test('ab')).toBe(true); // Minimum length
			expect(regex.test('a')).toBe(false); // Too short
			expect(regex.test('a'.repeat(100))).toBe(true); // Maximum length
			expect(regex.test('a'.repeat(101))).toBe(false); // Too long
		});

		it('should validate board name length', () => {
			const nameField = description.properties.find(
				(p) => p.name === 'name' && p.displayOptions?.show?.resource?.includes('board'),
			);

			expect(nameField?.typeOptions?.minLength).toBe(1);
			expect(nameField?.typeOptions?.maxLength).toBe(180);
		});
	});

	describe('User Experience Features', () => {
		it('should provide helpful notices for each resource type', () => {
			const notices = description.properties.filter((p) => p.type === 'notice');
			expect(notices.length).toBeGreaterThan(0);

			// Check that notices have appropriate themes
			const infoNotices = notices.filter((n) => n.typeOptions?.theme === 'info');
			const warningNotices = notices.filter((n) => n.typeOptions?.theme === 'warning');

			expect(infoNotices.length).toBeGreaterThan(0);
			expect(warningNotices.length).toBeGreaterThan(0);
		});

		it('should provide hints for complex fields', () => {
			const fieldsWithHints = description.properties.filter((p) => p.hint);
			expect(fieldsWithHints.length).toBeGreaterThan(5);

			// Check that hints are meaningful
			fieldsWithHints.forEach((field) => {
				expect(field.hint?.length).toBeGreaterThan(20);
			});
		});

		it('should provide placeholders for input fields', () => {
			const fieldsWithPlaceholders = description.properties.filter((p) => p.placeholder);
			expect(fieldsWithPlaceholders.length).toBeGreaterThan(3);

			// Check that placeholders are examples
			fieldsWithPlaceholders.forEach((field) => {
				expect(field.placeholder?.length).toBeGreaterThan(3);
			});
		});

		it('should have proper field descriptions', () => {
			const fieldsWithDescriptions = description.properties.filter(
				(p) => p.description && p.type !== 'notice',
			);

			fieldsWithDescriptions.forEach((field) => {
				expect(field.description?.length).toBeGreaterThan(10);
			});
		});
	});

	describe('Advanced Configuration', () => {
		it('should support advanced options for power users', () => {
			const returnAllField = description.properties.find((p) => p.name === 'returnAllFields');
			const simplifyField = description.properties.find((p) => p.name === 'simplifyOutput');

			expect(returnAllField).toBeDefined();
			expect(simplifyField).toBeDefined();

			// Check that these are boolean options with sensible defaults
			expect(returnAllField?.type).toBe('boolean');
			expect(simplifyField?.type).toBe('boolean');
			expect(returnAllField?.default).toBe(false);
			expect(simplifyField?.default).toBe(true);
		});

		it('should support bulk operations with proper configuration', () => {
			const bulkTypeField = description.properties.find((p) => p.name === 'bulkOperationType');
			expect(bulkTypeField).toBeDefined();
			const bulkOptions = (bulkTypeField as any)?.options as INodePropertyOptions[];
			expect(bulkOptions?.length).toBe(3);

			// Check that bulk operations are only shown for pin resource
			expect(bulkTypeField?.displayOptions?.show?.resource).toContain('pin');
			expect(bulkTypeField?.displayOptions?.show?.operation).toContain('bulk');
		});
	});
});

/**
 * Test helper functions for UI validation
 */
describe('Pinterest Node UI Helpers', () => {
	let description: INodeTypeDescription;

	beforeEach(() => {
		description = PinterestDescription;
	});

	describe('Field Visibility Logic', () => {
		it('should have mutually exclusive media source fields', () => {
			const mediaUrlField = description.properties.find((p) => p.name === 'mediaUrl');
			const binaryField = description.properties.find(
				(p) =>
					p.name === 'binaryPropertyName' &&
					p.displayOptions?.show?.mediaSource?.includes('upload'),
			);

			// URL field should only show for 'url' source
			expect(mediaUrlField?.displayOptions?.show?.mediaSource).toEqual(['url']);

			// Binary field should only show for 'upload' source
			expect(binaryField?.displayOptions?.show?.mediaSource).toEqual(['upload']);
		});

		it('should have resource-specific operation fields', () => {
			const operationFields = description.properties.filter((p) => p.name === 'operation');

			// Each operation field should be tied to specific resources
			operationFields.forEach((field) => {
				expect(field.displayOptions?.show?.resource).toBeDefined();
				expect(field.displayOptions?.show?.resource?.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Validation Error Messages', () => {
		it('should provide actionable error messages', () => {
			const fieldsWithValidation = description.properties.filter(
				(p) => p.typeOptions?.validation && p.typeOptions.validation.length > 0,
			);

			fieldsWithValidation.forEach((field) => {
				const validation = field.typeOptions?.validation?.[0];
				const errorMessage = validation?.properties?.errorMessage;

				expect(errorMessage).toBeDefined();
				expect(errorMessage?.length).toBeGreaterThan(15);

				// Error messages should be specific and helpful
				if (field.name?.includes('Id')) {
					expect(errorMessage?.toLowerCase()).toContain('digit');
				}
				if (field.name === 'mediaUrl') {
					expect(errorMessage?.toLowerCase()).toContain('url');
				}
			});
		});
	});
});
