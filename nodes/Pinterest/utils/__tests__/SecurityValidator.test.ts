import { NodeOperationError } from 'n8n-workflow';
import { SecurityValidator } from '../SecurityValidator';

describe('SecurityValidator', () => {
	let validator: SecurityValidator;
	let mockNode: any;

	beforeEach(() => {
		mockNode = {
			id: 'test-node-id',
			name: 'Test Pinterest Node',
			type: 'n8n-nodes-pinterest.pinterest',
		};
		validator = new SecurityValidator(mockNode);
	});

	describe('sanitizeString', () => {
		it('should sanitize basic string input', () => {
			const result = validator.sanitizeString('  Hello World  ', 'test field');
			expect(result).toBe('Hello World');
		});

		it('should remove dangerous script tags', () => {
			const maliciousInput = 'Hello <script>alert("xss")</script> World';
			const result = validator.sanitizeString(maliciousInput, 'test field');
			expect(result).toBe('Hello  World');
		});

		it('should remove javascript: protocols', () => {
			const maliciousInput = 'javascript:alert("xss")';
			const result = validator.sanitizeString(maliciousInput, 'test field');
			expect(result).toBe('');
		});

		it('should remove null bytes and control characters', () => {
			const maliciousInput = 'Hello\x00\x01\x02World\x7F';
			const result = validator.sanitizeString(maliciousInput, 'test field');
			expect(result).toBe('HelloWorld');
		});

		it('should preserve newlines and tabs', () => {
			const input = 'Hello\nWorld\tTest';
			const result = validator.sanitizeString(input, 'test field');
			expect(result).toBe('Hello\nWorld\tTest');
		});

		it('should throw error for input too long', () => {
			const longInput = 'a'.repeat(10001);
			expect(() => validator.sanitizeString(longInput, 'test field')).toThrow(NodeOperationError);
		});

		it('should throw error for non-string input', () => {
			expect(() => validator.sanitizeString(123 as any, 'test field')).toThrow(NodeOperationError);
		});

		it('should handle undefined input', () => {
			const result = validator.sanitizeString(undefined, 'test field');
			expect(result).toBe('');
		});

		it('should respect custom max length', () => {
			const input = 'a'.repeat(200);
			expect(() => validator.sanitizeString(input, 'test field', 100)).toThrow(NodeOperationError);
		});
	});

	describe('sanitizeUrl', () => {
		it('should validate and return valid HTTPS URL', () => {
			const url = 'https://example.com/path?param=value';
			const result = validator.sanitizeUrl(url, 'test URL');
			expect(result).toBe(url);
		});

		it('should validate and return valid HTTP URL', () => {
			const url = 'http://example.com/path';
			const result = validator.sanitizeUrl(url, 'test URL');
			expect(result).toBe(url);
		});

		it('should reject javascript: protocol', () => {
			const maliciousUrl = 'javascript:alert("xss")';
			expect(() => validator.sanitizeUrl(maliciousUrl, 'test URL')).toThrow(NodeOperationError);
		});

		it('should reject data: protocol', () => {
			const maliciousUrl = 'data:text/html,<script>alert("xss")</script>';
			expect(() => validator.sanitizeUrl(maliciousUrl, 'test URL')).toThrow(NodeOperationError);
		});

		it('should reject file: protocol', () => {
			const maliciousUrl = 'file:///etc/passwd';
			expect(() => validator.sanitizeUrl(maliciousUrl, 'test URL')).toThrow(NodeOperationError);
		});

		it('should handle empty URL', () => {
			const result = validator.sanitizeUrl('', 'test URL');
			expect(result).toBe('');
		});

		it('should handle undefined URL', () => {
			const result = validator.sanitizeUrl(undefined, 'test URL');
			expect(result).toBe('');
		});

		it('should throw error for invalid URL format', () => {
			const invalidUrl = 'not-a-url';
			expect(() => validator.sanitizeUrl(invalidUrl, 'test URL')).toThrow(NodeOperationError);
		});

		it('should handle URL with suspicious patterns', () => {
			const suspiciousUrl = 'https://example.com/javascript:void(0)';
			expect(() => validator.sanitizeUrl(suspiciousUrl, 'test URL')).toThrow(NodeOperationError);
		});
	});

	describe('validatePinterestId', () => {
		it('should validate valid Pinterest ID', () => {
			const validId = 'abc123_def-456';
			const result = validator.validatePinterestId(validId, 'Pin ID');
			expect(result).toBe(validId);
		});

		it('should throw error for empty ID', () => {
			expect(() => validator.validatePinterestId('', 'Pin ID')).toThrow(NodeOperationError);
		});

		it('should throw error for undefined ID', () => {
			expect(() => validator.validatePinterestId(undefined, 'Pin ID')).toThrow(NodeOperationError);
		});

		it('should throw error for ID with invalid characters', () => {
			const invalidId = 'abc123@def';
			expect(() => validator.validatePinterestId(invalidId, 'Pin ID')).toThrow(NodeOperationError);
		});

		it('should throw error for ID too long', () => {
			const longId = 'a'.repeat(51);
			expect(() => validator.validatePinterestId(longId, 'Pin ID')).toThrow(NodeOperationError);
		});

		it('should handle ID with spaces (should be trimmed)', () => {
			const idWithSpaces = '  abc123  ';
			const result = validator.validatePinterestId(idWithSpaces, 'Pin ID');
			expect(result).toBe('abc123');
		});
	});

	describe('validatePrivacySetting', () => {
		it('should validate public privacy setting', () => {
			const result = validator.validatePrivacySetting('public');
			expect(result).toBe('public');
		});

		it('should validate protected privacy setting', () => {
			const result = validator.validatePrivacySetting('protected');
			expect(result).toBe('protected');
		});

		it('should validate secret privacy setting', () => {
			const result = validator.validatePrivacySetting('secret');
			expect(result).toBe('secret');
		});

		it('should handle case insensitive input', () => {
			const result = validator.validatePrivacySetting('PUBLIC');
			expect(result).toBe('public');
		});

		it('should default to public for undefined input', () => {
			const result = validator.validatePrivacySetting(undefined);
			expect(result).toBe('public');
		});

		it('should throw error for invalid privacy setting', () => {
			expect(() => validator.validatePrivacySetting('invalid')).toThrow(NodeOperationError);
		});
	});

	describe('validateFileUpload', () => {
		it('should validate valid image file', () => {
			const fileData = {
				size: 1024 * 1024, // 1MB
				mimeType: 'image/jpeg',
				name: 'test.jpg',
			};
			expect(() => validator.validateFileUpload(fileData, 'test file')).not.toThrow();
		});

		it('should validate valid video file', () => {
			const fileData = {
				size: 50 * 1024 * 1024, // 50MB
				mimeType: 'video/mp4',
				name: 'test.mp4',
			};
			expect(() => validator.validateFileUpload(fileData, 'test file')).not.toThrow();
		});

		it('should throw error for missing file data', () => {
			expect(() => validator.validateFileUpload(null, 'test file')).toThrow(NodeOperationError);
		});

		it('should throw error for non-object file data', () => {
			expect(() => validator.validateFileUpload('not-an-object', 'test file')).toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for image file too large', () => {
			const fileData = {
				size: 15 * 1024 * 1024, // 15MB (over 10MB limit for images)
				mimeType: 'image/jpeg',
				name: 'test.jpg',
			};
			expect(() => validator.validateFileUpload(fileData, 'test file')).toThrow(NodeOperationError);
		});

		it('should throw error for video file too large', () => {
			const fileData = {
				size: 150 * 1024 * 1024, // 150MB (over 100MB limit for videos)
				mimeType: 'video/mp4',
				name: 'test.mp4',
			};
			expect(() => validator.validateFileUpload(fileData, 'test file')).toThrow(NodeOperationError);
		});

		it('should throw error for unsupported MIME type', () => {
			const fileData = {
				size: 1024 * 1024,
				mimeType: 'application/pdf',
				name: 'test.pdf',
			};
			expect(() => validator.validateFileUpload(fileData, 'test file')).toThrow(NodeOperationError);
		});
	});

	describe('validateSearchQuery', () => {
		it('should validate normal search query', () => {
			const query = 'cats and dogs';
			const result = validator.validateSearchQuery(query);
			expect(result).toBe(query);
		});

		it('should throw error for empty query', () => {
			expect(() => validator.validateSearchQuery('')).toThrow(NodeOperationError);
		});

		it('should throw error for undefined query', () => {
			expect(() => validator.validateSearchQuery(undefined)).toThrow(NodeOperationError);
		});

		it('should detect SQL injection patterns', () => {
			const maliciousQuery = "'; DROP TABLE users; --";
			expect(() => validator.validateSearchQuery(maliciousQuery)).toThrow(NodeOperationError);
		});

		it('should detect SELECT statements', () => {
			const maliciousQuery = 'SELECT * FROM users';
			expect(() => validator.validateSearchQuery(maliciousQuery)).toThrow(NodeOperationError);
		});

		it('should detect UNION attacks', () => {
			const maliciousQuery = 'cats UNION SELECT password FROM users';
			expect(() => validator.validateSearchQuery(maliciousQuery)).toThrow(NodeOperationError);
		});

		it('should allow legitimate queries with common words', () => {
			const query = 'select cats for adoption';
			const result = validator.validateSearchQuery(query);
			expect(result).toBe(query);
		});
	});

	describe('validateNumericParameter', () => {
		it('should validate valid number', () => {
			const result = validator.validateNumericParameter(42, 'test number');
			expect(result).toBe(42);
		});

		it('should validate string number', () => {
			const result = validator.validateNumericParameter('42', 'test number');
			expect(result).toBe(42);
		});

		it('should return undefined for undefined input', () => {
			const result = validator.validateNumericParameter(undefined, 'test number');
			expect(result).toBeUndefined();
		});

		it('should return undefined for empty string', () => {
			const result = validator.validateNumericParameter('', 'test number');
			expect(result).toBeUndefined();
		});

		it('should throw error for non-numeric input', () => {
			expect(() => validator.validateNumericParameter('not-a-number', 'test number')).toThrow(
				NodeOperationError,
			);
		});

		it('should validate minimum value', () => {
			expect(() => validator.validateNumericParameter(5, 'test number', 10)).toThrow(
				NodeOperationError,
			);
		});

		it('should validate maximum value', () => {
			expect(() => validator.validateNumericParameter(15, 'test number', 0, 10)).toThrow(
				NodeOperationError,
			);
		});

		it('should accept value within range', () => {
			const result = validator.validateNumericParameter(7, 'test number', 5, 10);
			expect(result).toBe(7);
		});
	});

	describe('validateDateParameter', () => {
		it('should validate valid ISO date', () => {
			const date = '2023-12-25';
			const result = validator.validateDateParameter(date, 'test date');
			expect(result).toBe(date);
		});

		it('should return undefined for undefined input', () => {
			const result = validator.validateDateParameter(undefined, 'test date');
			expect(result).toBeUndefined();
		});

		it('should throw error for invalid date format', () => {
			expect(() => validator.validateDateParameter('25/12/2023', 'test date')).toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for invalid date', () => {
			expect(() => validator.validateDateParameter('2023-13-45', 'test date')).toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for date too far in past', () => {
			expect(() => validator.validateDateParameter('1900-01-01', 'test date')).toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for date too far in future', () => {
			expect(() => validator.validateDateParameter('2030-01-01', 'test date')).toThrow(
				NodeOperationError,
			);
		});
	});

	describe('validateArrayParameter', () => {
		it('should validate array input', () => {
			const array = ['item1', 'item2', 'item3'];
			const result = validator.validateArrayParameter(array, 'test array');
			expect(result).toEqual(array);
		});

		it('should validate comma-separated string', () => {
			const input = 'item1,item2,item3';
			const result = validator.validateArrayParameter(input, 'test array');
			expect(result).toEqual(['item1', 'item2', 'item3']);
		});

		it('should return undefined for undefined input', () => {
			const result = validator.validateArrayParameter(undefined, 'test array');
			expect(result).toBeUndefined();
		});

		it('should throw error for non-array, non-string input', () => {
			expect(() => validator.validateArrayParameter(123, 'test array')).toThrow(NodeOperationError);
		});

		it('should validate against allowed values', () => {
			const allowedValues = ['red', 'green', 'blue'];
			const result = validator.validateArrayParameter(['red', 'blue'], 'colors', allowedValues);
			expect(result).toEqual(['red', 'blue']);
		});

		it('should throw error for disallowed values', () => {
			const allowedValues = ['red', 'green', 'blue'];
			expect(() =>
				validator.validateArrayParameter(['red', 'yellow'], 'colors', allowedValues),
			).toThrow(NodeOperationError);
		});

		it('should validate max length', () => {
			const longArray = ['a', 'b', 'c', 'd', 'e'];
			expect(() => validator.validateArrayParameter(longArray, 'test array', undefined, 3)).toThrow(
				NodeOperationError,
			);
		});

		it('should filter out empty items', () => {
			const input = 'item1,,item2,  ,item3';
			const result = validator.validateArrayParameter(input, 'test array');
			expect(result).toEqual(['item1', 'item2', 'item3']);
		});
	});

	describe('validateBooleanParameter', () => {
		it('should validate true boolean', () => {
			const result = validator.validateBooleanParameter(true, 'test boolean');
			expect(result).toBe(true);
		});

		it('should validate false boolean', () => {
			const result = validator.validateBooleanParameter(false, 'test boolean');
			expect(result).toBe(false);
		});

		it('should validate "true" string', () => {
			const result = validator.validateBooleanParameter('true', 'test boolean');
			expect(result).toBe(true);
		});

		it('should validate "false" string', () => {
			const result = validator.validateBooleanParameter('false', 'test boolean');
			expect(result).toBe(false);
		});

		it('should validate "1" as true', () => {
			const result = validator.validateBooleanParameter('1', 'test boolean');
			expect(result).toBe(true);
		});

		it('should validate "0" as false', () => {
			const result = validator.validateBooleanParameter('0', 'test boolean');
			expect(result).toBe(false);
		});

		it('should return undefined for undefined input', () => {
			const result = validator.validateBooleanParameter(undefined, 'test boolean');
			expect(result).toBeUndefined();
		});

		it('should throw error for invalid boolean string', () => {
			expect(() => validator.validateBooleanParameter('maybe', 'test boolean')).toThrow(
				NodeOperationError,
			);
		});
	});

	describe('static methods', () => {
		it('should generate secure random string', () => {
			const random1 = SecurityValidator.generateSecureRandom(16);
			const random2 = SecurityValidator.generateSecureRandom(16);

			expect(random1).toHaveLength(32); // 16 bytes = 32 hex chars
			expect(random2).toHaveLength(32);
			expect(random1).not.toBe(random2);
			expect(/^[a-f0-9]+$/.test(random1)).toBe(true);
		});

		it('should hash sensitive data consistently', () => {
			const data = 'sensitive-information';
			const hash1 = SecurityValidator.hashSensitiveData(data);
			const hash2 = SecurityValidator.hashSensitiveData(data);

			expect(hash1).toBe(hash2);
			expect(hash1).toHaveLength(8);
			expect(/^[a-f0-9]+$/.test(hash1)).toBe(true);
		});

		it('should produce different hashes for different data', () => {
			const hash1 = SecurityValidator.hashSensitiveData('data1');
			const hash2 = SecurityValidator.hashSensitiveData('data2');

			expect(hash1).not.toBe(hash2);
		});
	});
});
