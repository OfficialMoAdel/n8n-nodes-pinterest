import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { Pinterest } from '../Pinterest.node';
import { PinterestDescription } from '../PinterestDescription';

describe('Pinterest Node - Integration Tests', () => {
	let pinterest: Pinterest;

	beforeEach(() => {
		pinterest = new Pinterest();
	});

	describe('Node Description', () => {
		it('should have correct node description structure', () => {
			expect(pinterest.description).toBeDefined();
			expect(pinterest.description.displayName).toBe('Pinterest');
			expect(pinterest.description.name).toBe('pinterest');
			expect(pinterest.description.version).toBe(1);
		});

		it('should have all required resources defined', () => {
			const resourceProperty = pinterest.description.properties?.find(
				(prop) => prop.name === 'resource',
			);

			expect(resourceProperty).toBeDefined();
			expect(resourceProperty?.type).toBe('options');

			const resourceOptions = (resourceProperty as any)?.options;
			expect(resourceOptions).toHaveLength(5);

			const resourceValues = resourceOptions.map((option: any) => option.value);
			expect(resourceValues).toContain('pin');
			expect(resourceValues).toContain('board');
			expect(resourceValues).toContain('user');
			expect(resourceValues).toContain('search');
			expect(resourceValues).toContain('media');
		});

		it('should have pin operations defined', () => {
			const pinOperationProperty = pinterest.description.properties?.find(
				(prop) => prop.name === 'operation' && prop.displayOptions?.show?.resource?.includes('pin'),
			);

			expect(pinOperationProperty).toBeDefined();
			const operationOptions = (pinOperationProperty as any)?.options;
			expect(operationOptions).toBeDefined();

			const operationValues = operationOptions.map((option: any) => option.value);
			expect(operationValues).toContain('create');
			expect(operationValues).toContain('get');
			expect(operationValues).toContain('update');
			expect(operationValues).toContain('delete');
			expect(operationValues).toContain('bulk');
		});

		it('should have dynamic fields for pin create operation', () => {
			const boardIdField = pinterest.description.properties?.find(
				(prop) =>
					prop.name === 'boardId' &&
					prop.displayOptions?.show?.resource?.includes('pin') &&
					prop.displayOptions?.show?.operation?.includes('create'),
			);

			expect(boardIdField).toBeDefined();
			expect(boardIdField?.required).toBe(true);

			const mediaSourceField = pinterest.description.properties?.find(
				(prop) =>
					prop.name === 'mediaSource' &&
					prop.displayOptions?.show?.resource?.includes('pin') &&
					prop.displayOptions?.show?.operation?.includes('create'),
			);

			expect(mediaSourceField).toBeDefined();
			expect(mediaSourceField?.required).toBe(true);
		});
	});

	describe('Node Configuration', () => {
		it('should use the comprehensive description', () => {
			expect(pinterest.description).toBe(PinterestDescription);
		});

		it('should have correct credentials configuration', () => {
			expect(pinterest.description.credentials).toHaveLength(1);
			expect(pinterest.description.credentials?.[0].name).toBe('pinterestOAuth2Api');
			expect(pinterest.description.credentials?.[0].required).toBe(true);
		});

		it('should have correct input/output configuration', () => {
			expect(pinterest.description.inputs).toHaveLength(1);
			expect(pinterest.description.outputs).toHaveLength(1);
		});

		it('should have correct request defaults', () => {
			expect(pinterest.description.requestDefaults?.baseURL).toBe('https://api.pinterest.com/v5');
			expect(pinterest.description.requestDefaults?.headers).toMatchObject({
				Accept: 'application/json',
				'Content-Type': 'application/json',
			});
		});
	});

	describe('Operation Validation', () => {
		it('should validate resource and operation combinations correctly', () => {
			const mockNode = {
				id: 'test-node',
				name: 'Pinterest Test',
				type: 'pinterest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			// Valid combinations should not throw
			expect(() => {
				(Pinterest as any).validateResourceOperation('pin', 'create', mockNode);
			}).not.toThrow();

			expect(() => {
				(Pinterest as any).validateResourceOperation('board', 'update', mockNode);
			}).not.toThrow();

			expect(() => {
				(Pinterest as any).validateResourceOperation('user', 'getProfile', mockNode);
			}).not.toThrow();

			expect(() => {
				(Pinterest as any).validateResourceOperation('search', 'pins', mockNode);
			}).not.toThrow();

			// Invalid combinations should throw
			expect(() => {
				(Pinterest as any).validateResourceOperation('invalid', 'create', mockNode);
			}).toThrow('Invalid resource: invalid');

			expect(() => {
				(Pinterest as any).validateResourceOperation('pin', 'invalid', mockNode);
			}).toThrow("Invalid operation 'invalid' for resource 'pin'");
		});
	});

	describe('Error Context Enhancement', () => {
		it('should enhance error context with operation details', () => {
			const error = new Error('Test error');

			(Pinterest as any).enhanceErrorContext(error, 'pin', 'create', 0);

			expect((error as any).resource).toBe('pin');
			expect((error as any).operation).toBe('create');
			expect((error as any).itemIndex).toBe(0);
		});

		it('should not overwrite existing error context', () => {
			const error = new Error('Test error') as any;
			error.resource = 'existing';
			error.operation = 'existing';
			error.itemIndex = 999;

			(Pinterest as any).enhanceErrorContext(error, 'pin', 'create', 0);

			expect(error.resource).toBe('existing');
			expect(error.operation).toBe('existing');
			expect(error.itemIndex).toBe(999);
		});
	});

	describe('Field Visibility Logic', () => {
		it('should have proper display options for conditional fields', () => {
			// Media URL field should only show when mediaSource is 'url'
			const mediaUrlField = pinterest.description.properties?.find(
				(prop) => prop.name === 'mediaUrl',
			);

			expect(mediaUrlField?.displayOptions?.show?.mediaSource).toContain('url');

			// Binary property field should only show when mediaSource is 'upload'
			const binaryPropertyField = pinterest.description.properties?.find(
				(prop) =>
					prop.name === 'binaryPropertyName' &&
					prop.displayOptions?.show?.resource?.includes('pin'),
			);

			expect(binaryPropertyField?.displayOptions?.show?.mediaSource).toContain('upload');
		});

		it('should have analytics fields for user operations', () => {
			const startDateField = pinterest.description.properties?.find(
				(prop) =>
					prop.name === 'startDate' && prop.displayOptions?.show?.resource?.includes('user'),
			);

			expect(startDateField).toBeDefined();
			expect(startDateField?.displayOptions?.show?.operation).toContain('getAnalytics');
			expect(startDateField?.displayOptions?.show?.operation).toContain('getPinAnalytics');
			expect(startDateField?.displayOptions?.show?.operation).toContain('getBoardAnalytics');
		});
	});

	describe('Node Metadata', () => {
		it('should have correct node metadata', () => {
			expect(pinterest.description.group).toContain('transform');
			expect(pinterest.description.subtitle).toBe(
				'={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			);
			expect(pinterest.description.description).toContain('Pinterest API v5');
		});

		it('should have proper default values', () => {
			expect(pinterest.description.defaults?.name).toBe('Pinterest');

			const resourceField = pinterest.description.properties?.find(
				(prop) => prop.name === 'resource',
			);
			expect(resourceField?.default).toBe('pin');
		});
	});
});
