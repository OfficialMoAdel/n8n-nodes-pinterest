import { AuditLogger } from '../AuditLogger';
import { CredentialSecurityValidator } from '../CredentialSecurityValidator';

// Mock console methods
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('AuditLogger', () => {
	let auditLogger: AuditLogger;
	let mockNode: any;
	let mockCredentials: any;

	beforeEach(() => {
		mockNode = {
			id: 'test-node-id',
			name: 'Test Pinterest Node',
			type: 'n8n-nodes-pinterest.pinterest',
		};

		mockCredentials = {
			clientId: '1234567890123456789',
			clientSecret: 'abcdef1234567890abcdef1234567890',
			scope: 'user_accounts:read,boards:read,pins:read',
			oauthTokenData: {
				access_token: 'valid_access_token_1234567890',
			},
		};

		auditLogger = new AuditLogger(mockNode, 'test-workflow-id', 'test-execution-id');

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

	describe('logAuthenticationEvent', () => {
		it('should log successful authentication', () => {
			auditLogger.logAuthenticationEvent('success', mockCredentials);

			expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleInfo.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('auth:success');
			expect(logData.level).toBe('INFO');
			expect(logData.node_id).toBe('test-node-id');
			expect(logData.workflow_id).toBe('test-workflow-id');
			expect(logData.execution_id).toBe('test-execution-id');
			expect(logData.credential_hash).toMatch(/^pinterest_cred_[a-f0-9]{8}$/);
		});

		it('should log authentication failure as security event', () => {
			auditLogger.logAuthenticationEvent('failure', mockCredentials, {
				error: 'Invalid credentials',
				attemptCount: 3,
			});

			expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleError.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('auth:failure');
			expect(logData.level).toBe('SECURITY');
		});

		it('should log token refresh events', () => {
			auditLogger.logAuthenticationEvent('token_refresh', mockCredentials);

			expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleInfo.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('auth:token_refresh');
			expect(logData.level).toBe('INFO');
		});

		it('should sanitize sensitive details', () => {
			auditLogger.logAuthenticationEvent('success', mockCredentials, {
				userAgent: 'Mozilla/5.0 (Test Browser)',
				ipAddress: '192.168.1.100',
				password: 'secret_password', // Should be hashed
			});

			const logCall = mockConsoleInfo.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.details.password).not.toBe('secret_password');
			expect(logData.details.password).toMatch(/^[a-f0-9]{8}$/);
			expect(logData.ip_address).toMatch(/^[a-f0-9]{8}$/);
		});
	});

	describe('logApiOperation', () => {
		it('should log sensitive operations', () => {
			auditLogger.logApiOperation('create', 'pin', mockCredentials, true, {
				responseTime: 250,
				statusCode: 201,
			});

			expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleInfo.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('api:pin:create');
			expect(logData.operation).toBe('create');
			expect(logData.resource).toBe('pin');
			expect(logData.success).toBe(true);
			expect(logData.sensitive).toBe(true);
			expect(logData.response_time_ms).toBe(250);
			expect(logData.status_code).toBe(201);
		});

		it('should log failed operations as warnings', () => {
			auditLogger.logApiOperation('delete', 'pin', mockCredentials, false, {
				statusCode: 404,
				errorType: 'not_found',
			});

			expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleWarn.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.success).toBe(false);
			expect(logData.level).toBe('WARN');
			expect(logData.error_type).toBe('not_found');
		});

		it('should skip non-sensitive successful operations', () => {
			auditLogger.logApiOperation('get', 'user', mockCredentials, true);

			// Should not log non-sensitive successful operations
			expect(mockConsoleInfo).not.toHaveBeenCalled();
		});

		it('should hash resource IDs', () => {
			auditLogger.logApiOperation('update', 'pin', mockCredentials, true, {
				resourceId: 'sensitive_pin_id_12345',
			});

			const logCall = mockConsoleInfo.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.resource_id).not.toBe('sensitive_pin_id_12345');
			expect(logData.resource_id).toMatch(/^[a-f0-9]{8}$/);
		});
	});

	describe('logRateLimitEvent', () => {
		it('should log rate limit approaching', () => {
			auditLogger.logRateLimitEvent('approaching', mockCredentials, {
				limit: 1000,
				remaining: 100,
				reset: Math.floor(Date.now() / 1000) + 3600,
			});

			expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleInfo.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('rate_limit:approaching');
			expect(logData.level).toBe('INFO');
			expect(logData.rate_limit).toBe(1000);
			expect(logData.rate_remaining).toBe(100);
		});

		it('should log rate limit exceeded as warning', () => {
			auditLogger.logRateLimitEvent('exceeded', mockCredentials, {
				limit: 1000,
				remaining: 0,
				reset: Math.floor(Date.now() / 1000) + 3600,
			});

			expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleWarn.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('rate_limit:exceeded');
			expect(logData.level).toBe('WARN');
		});

		it('should include reset time in ISO format', () => {
			const resetTimestamp = Math.floor(Date.now() / 1000) + 3600;
			auditLogger.logRateLimitEvent('reset', mockCredentials, {
				reset: resetTimestamp,
			});

			const logCall = mockConsoleInfo.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.reset_time).toBe(new Date(resetTimestamp * 1000).toISOString());
		});
	});

	describe('logSecurityViolation', () => {
		it('should log security violations as security level', () => {
			auditLogger.logSecurityViolation('suspicious_activity', {
				description: 'Multiple failed authentication attempts',
				attemptCount: 5,
			});

			expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleError.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('security:suspicious_activity');
			expect(logData.level).toBe('SECURITY');
			expect(logData.violation_type).toBe('suspicious_activity');
			expect(logData.severity).toBe('high');
		});

		it('should assign appropriate severity levels', () => {
			const testCases = [
				{ violation: 'authentication_failure', expectedSeverity: 'high' },
				{ violation: 'rate_limit_exceeded', expectedSeverity: 'medium' },
				{ violation: 'input_validation_failure', expectedSeverity: 'low' },
				{ violation: 'unknown_violation', expectedSeverity: 'medium' },
			];

			testCases.forEach(({ violation, expectedSeverity }) => {
				auditLogger.logSecurityViolation(violation, {});

				const logCall = mockConsoleError.mock.calls[mockConsoleError.mock.calls.length - 1][0];
				const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

				expect(logData.severity).toBe(expectedSeverity);
			});
		});
	});

	describe('logValidationFailure', () => {
		it('should log validation failures with field details', () => {
			auditLogger.logValidationFailure(
				'pin_title',
				'invalid<script>alert()</script>',
				'Contains dangerous content',
			);

			expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleWarn.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('validation:failure');
			expect(logData.field).toBe('pin_title');
			expect(logData.reason).toBe('Contains dangerous content');
			expect(logData.value_type).toBe('string');
			expect(logData.value_length).toBe(32);
			expect(logData.value_hash).toMatch(/^[a-f0-9]{8}$/);
		});

		it('should handle non-string values', () => {
			auditLogger.logValidationFailure('numeric_field', 12345, 'Invalid number');

			const logCall = mockConsoleWarn.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.value_type).toBe('number');
			expect(logData.value_length).toBeUndefined();
		});
	});

	describe('logCredentialSecurityEvent', () => {
		it('should log credential validation events', () => {
			auditLogger.logCredentialSecurityEvent('validation', mockCredentials, {
				validation_result: 'success',
			});

			expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('[AUDIT]'));

			const logCall = mockConsoleError.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('credential:validation');
			expect(logData.level).toBe('SECURITY');
			expect(logData.scopes).toEqual(['user_accounts:read', 'boards:read', 'pins:read']);
		});

		it('should log weak secret detection', () => {
			auditLogger.logCredentialSecurityEvent('weak_secret', mockCredentials, {
				weakness_type: 'sequential_pattern',
			});

			const logCall = mockConsoleError.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.event).toBe('credential:weak_secret');
		});
	});

	describe('data sanitization', () => {
		it('should sanitize nested sensitive data', () => {
			auditLogger.logApiOperation('create', 'pin', mockCredentials, true, {
				requestData: {
					title: 'Safe title',
					credentials: {
						password: 'secret123',
						token: 'bearer_token_xyz',
					},
				},
			});

			const logCall = mockConsoleInfo.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.details.requestData.title).toBe('Safe title');
			expect(logData.details.requestData.credentials.password).toMatch(/^[a-f0-9]{8}$/);
			expect(logData.details.requestData.credentials.token).toMatch(/^[a-f0-9]{8}$/);
		});

		it('should handle null and undefined values', () => {
			auditLogger.logValidationFailure('test_field', null, 'Null value');

			const logCall = mockConsoleWarn.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.value_hash).toBe('null');
		});

		it('should sanitize user agent strings', () => {
			auditLogger.logAuthenticationEvent('success', mockCredentials, {
				userAgent:
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 <script>alert()</script>',
			});

			const logCall = mockConsoleInfo.mock.calls[0][0];
			const logData = JSON.parse(logCall.replace('[AUDIT] ', ''));

			expect(logData.user_agent).not.toContain('<script>');
			expect(logData.user_agent.length).toBeLessThanOrEqual(200);
		});
	});

	describe('static factory method', () => {
		it('should create audit logger with execution context', () => {
			const logger = AuditLogger.createForExecution(mockNode, 'workflow-123', 'execution-456');

			expect(logger).toBeInstanceOf(AuditLogger);
			expect(logger['workflowId']).toBe('workflow-123');
			expect(logger['executionId']).toBe('execution-456');
		});
	});

	describe('session ID generation', () => {
		it('should generate unique session IDs', () => {
			auditLogger.logSecurityViolation('test_violation_1', {});
			auditLogger.logSecurityViolation('test_violation_2', {});

			const log1 = JSON.parse(mockConsoleError.mock.calls[0][0].replace('[AUDIT] ', ''));
			const log2 = JSON.parse(mockConsoleError.mock.calls[1][0].replace('[AUDIT] ', ''));

			expect(log1.session_id).toBeDefined();
			expect(log2.session_id).toBeDefined();
			expect(log1.session_id).not.toBe(log2.session_id);
			expect(log1.session_id).toMatch(/^[a-f0-9]{32}$/);
		});
	});

	describe('credential hash consistency', () => {
		it('should generate consistent hashes for same credentials', () => {
			auditLogger.logAuthenticationEvent('success', mockCredentials);
			auditLogger.logApiOperation('create', 'pin', mockCredentials, true);

			const log1 = JSON.parse(mockConsoleInfo.mock.calls[0][0].replace('[AUDIT] ', ''));
			const log2 = JSON.parse(mockConsoleInfo.mock.calls[1][0].replace('[AUDIT] ', ''));

			expect(log1.credential_hash).toBe(log2.credential_hash);
		});
	});
});
