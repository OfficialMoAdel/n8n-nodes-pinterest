import { NodeApiError, type INode } from 'n8n-workflow';
import { ErrorHandler } from '../ErrorHandler';

// Mock node for testing
const mockNode: INode = {
	id: 'test-node-id',
	name: 'Pinterest Test Node',
	type: 'n8n-nodes-pinterest.pinterest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('ErrorHandler', () => {
	let errorHandler: ErrorHandler;

	beforeEach(() => {
		errorHandler = new ErrorHandler(mockNode);
	});

	describe('handleApiError', () => {
		describe('400 Bad Request errors', () => {
			it('should handle basic 400 error', () => {
				const error = {
					response: {
						status: 400,
						data: {
							message: 'Invalid board_id',
						},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result).toBeInstanceOf(NodeApiError);
				expect(result.httpCode).toBe('400');
				expect(result.message).toBe('Bad request - please check your parameters');
				expect(result.description).toContain('Invalid board_id');
			});

			it('should handle 400 error with field details', () => {
				const error = {
					response: {
						status: 400,
						data: {
							message: 'Validation failed',
							details: [
								{ field: 'board_id', reason: 'is required' },
								{ field: 'media_source', reason: 'invalid format' },
							],
						},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result.description).toContain('Field validation errors:');
				expect(result.description).toContain('• board_id: is required');
				expect(result.description).toContain('• media_source: invalid format');
			});

			it('should handle 400 error without specific message', () => {
				const error = {
					response: {
						status: 400,
						data: {},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result.message).toBe('Bad request - please check your parameters');
				expect(result.description).toContain('Missing required fields');
			});
		});

		describe('401 Unauthorized errors', () => {
			it('should handle 401 authentication error', () => {
				const error = {
					response: {
						status: 401,
						data: {
							message: 'Invalid access token',
						},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result).toBeInstanceOf(NodeApiError);
				expect(result.httpCode).toBe('401');
				expect(result.message).toBe('Authorization failed - please check your credentials');
				expect(result.description).toContain('access token may have expired');
				expect(result.description).toContain('Reconnecting your Pinterest account');
			});

			it('should handle 401 error with OAuth error_description', () => {
				const error = {
					response: {
						status: 401,
						data: {
							error: 'invalid_token',
							error_description: 'The access token expired',
						},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result.httpCode).toBe('401');
				expect(result.description).toContain('continuous refresh tokens');
			});
		});

		describe('403 Forbidden errors', () => {
			it('should handle 403 permission error', () => {
				const error = {
					response: {
						status: 403,
						data: {
							message: 'Insufficient permissions',
						},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result).toBeInstanceOf(NodeApiError);
				expect(result.httpCode).toBe('403');
				expect(result.message).toBe('Forbidden - perhaps check your credentials?');
				expect(result.description).toContain('Pinterest app has the necessary scopes');
				expect(result.description).toContain('boards:read_secret scope');
			});
		});

		describe('404 Not Found errors', () => {
			it('should handle 404 resource not found', () => {
				const error = {
					response: {
						status: 404,
						data: {
							message: 'Pin not found',
						},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result).toBeInstanceOf(NodeApiError);
				expect(result.httpCode).toBe('404');
				expect(result.message).toBe('The resource you are requesting could not be found');
				expect(result.description).toContain('Pin ID, Board ID, or User ID is correct');
			});

			it('should handle 404 error without specific message', () => {
				const error = {
					response: {
						status: 404,
						data: {},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result.message).toBe('The resource you are requesting could not be found');
			});
		});

		describe('429 Rate Limit errors', () => {
			it('should handle 429 rate limit error', () => {
				const error = {
					response: {
						status: 429,
						data: {
							message: 'Rate limit exceeded',
						},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result).toBeInstanceOf(NodeApiError);
				expect(result.httpCode).toBe('429');
				expect(result.message).toBe('The service is receiving too many requests from you');
				expect(result.description).toContain('1000 requests/hour');
				expect(result.description).toContain('automatically retry');
			});
		});

		describe('5xx Server errors', () => {
			it('should handle 500 internal server error', () => {
				const error = {
					response: {
						status: 500,
						data: {
							message: 'Internal server error',
						},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result).toBeInstanceOf(NodeApiError);
				expect(result.httpCode).toBe('500');
				expect(result.message).toBe('The service was not able to process your request');
				expect(result.description).toContain('Pinterest is experiencing technical difficulties');
			});

			it('should handle 502 bad gateway error', () => {
				const error = {
					response: {
						status: 502,
						data: {},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result.httpCode).toBe('502');
				expect(result.message).toBe('Bad gateway - the service failed to handle your request');
			});

			it('should handle 503 service unavailable error', () => {
				const error = {
					response: {
						status: 503,
						data: {},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result.httpCode).toBe('503');
				expect(result.description).toContain('Try again in a few minutes');
			});

			it('should handle 504 gateway timeout error', () => {
				const error = {
					response: {
						status: 504,
						data: {},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result.httpCode).toBe('504');
			});
		});

		describe('Unknown errors', () => {
			it('should handle unknown status code', () => {
				const error = {
					response: {
						status: 418,
						data: {
							message: "I'm a teapot",
						},
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result).toBeInstanceOf(NodeApiError);
				expect(result.httpCode).toBe('418');
				expect(result.message).toBe(
					'Your request is invalid or could not be processed by the service',
				);
				expect(result.description).toContain('unexpected error occurred');
			});

			it('should handle error without response', () => {
				const error = {
					message: 'Network error',
				};

				const result = errorHandler.handleApiError(error);

				expect(result.httpCode).toBe('500');
				expect(result.message).toBe('The service was not able to process your request');
			});

			it('should handle error with status but no response', () => {
				const error = {
					status: 422,
					data: {
						message: 'Unprocessable entity',
					},
				};

				const result = errorHandler.handleApiError(error);

				expect(result.httpCode).toBe('422');
				expect(result.message).toBe(
					'Your request is invalid or could not be processed by the service',
				);
			});
		});
	});

	describe('isRetryableError', () => {
		it('should identify retryable status codes', () => {
			const retryableCodes = [408, 429, 500, 502, 503, 504];

			retryableCodes.forEach((code) => {
				const error = { response: { status: code } };
				expect(errorHandler.isRetryableError(error)).toBe(true);
			});
		});

		it('should identify non-retryable status codes', () => {
			const nonRetryableCodes = [400, 401, 403, 404];

			nonRetryableCodes.forEach((code) => {
				const error = { response: { status: code } };
				expect(errorHandler.isRetryableError(error)).toBe(false);
			});
		});

		it('should identify retryable network errors', () => {
			const networkErrors = [{ code: 'ECONNRESET' }, { code: 'ETIMEDOUT' }, { code: 'ENOTFOUND' }];

			networkErrors.forEach((error) => {
				expect(errorHandler.isRetryableError(error)).toBe(true);
			});
		});

		it('should not retry non-network errors without status', () => {
			const error = { code: 'SOME_OTHER_ERROR' };
			expect(errorHandler.isRetryableError(error)).toBe(false);
		});
	});

	describe('getRetryDelay', () => {
		it('should calculate exponential backoff delay', () => {
			const delay0 = errorHandler.getRetryDelay(0);
			const delay1 = errorHandler.getRetryDelay(1);
			const delay2 = errorHandler.getRetryDelay(2);

			expect(delay0).toBeGreaterThanOrEqual(1000); // Base delay
			expect(delay0).toBeLessThan(2000); // With jitter
			expect(delay1).toBeGreaterThan(delay0);
			expect(delay2).toBeGreaterThan(delay1);
		});

		it('should cap delay at maximum', () => {
			const delay = errorHandler.getRetryDelay(10); // Very high attempt
			expect(delay).toBeLessThanOrEqual(30000); // 30 second max
		});

		it('should include jitter in delay calculation', () => {
			const delays = Array.from({ length: 10 }, () => errorHandler.getRetryDelay(1));
			const uniqueDelays = new Set(delays);

			// With jitter, delays should be different
			expect(uniqueDelays.size).toBeGreaterThan(1);
		});
	});

	describe('getMaxRetryAttempts', () => {
		it('should return correct retry attempts for rate limit errors', () => {
			const error = { response: { status: 429 } };
			expect(errorHandler.getMaxRetryAttempts(error)).toBe(5);
		});

		it('should return correct retry attempts for server errors', () => {
			const serverErrors = [500, 502, 503, 504];

			serverErrors.forEach((status) => {
				const error = { response: { status } };
				expect(errorHandler.getMaxRetryAttempts(error)).toBe(3);
			});
		});

		it('should return default retry attempts for other errors', () => {
			const error = { code: 'ECONNRESET' };
			expect(errorHandler.getMaxRetryAttempts(error)).toBe(2);
		});
	});

	describe('isPinterestApiDown', () => {
		it('should identify when Pinterest API is down', () => {
			const serverErrorCodes = [500, 501, 502, 503, 504, 599];

			serverErrorCodes.forEach((status) => {
				const error = { response: { status } };
				expect(errorHandler.isPinterestApiDown(error)).toBe(true);
			});
		});

		it('should not identify client errors as API down', () => {
			const clientErrorCodes = [400, 401, 403, 404, 429];

			clientErrorCodes.forEach((status) => {
				const error = { response: { status } };
				expect(errorHandler.isPinterestApiDown(error)).toBe(false);
			});
		});

		it('should handle errors without status', () => {
			const error = { code: 'ECONNRESET' };
			expect(errorHandler.isPinterestApiDown(error)).toBe(false);
		});
	});

	describe('extractRateLimitInfo', () => {
		it('should extract rate limit headers', () => {
			const error = {
				response: {
					headers: {
						'x-ratelimit-limit': '1000',
						'x-ratelimit-remaining': '500',
						'x-ratelimit-reset': '1640995200',
					},
				},
			};

			const rateLimitInfo = errorHandler.extractRateLimitInfo(error);

			expect(rateLimitInfo).toEqual({
				limit: 1000,
				remaining: 500,
				reset: 1640995200,
			});
		});

		it('should handle partial rate limit headers', () => {
			const error = {
				response: {
					headers: {
						'x-ratelimit-remaining': '100',
					},
				},
			};

			const rateLimitInfo = errorHandler.extractRateLimitInfo(error);

			expect(rateLimitInfo).toEqual({
				limit: undefined,
				remaining: 100,
				reset: undefined,
			});
		});

		it('should return null for errors without headers', () => {
			const error = { response: {} };
			const rateLimitInfo = errorHandler.extractRateLimitInfo(error);

			expect(rateLimitInfo).toBeNull();
		});

		it('should return null for errors without response', () => {
			const error = { message: 'Network error' };
			const rateLimitInfo = errorHandler.extractRateLimitInfo(error);

			expect(rateLimitInfo).toBeNull();
		});
	});

	describe('getErrorDescription', () => {
		it('should handle Pinterest API error details format', () => {
			const errorData = {
				details: [
					{ field: 'board_id', reason: 'is required' },
					{ field: 'title', reason: 'too long' },
				],
			};

			const description = (errorHandler as any).getErrorDescription(errorData);

			expect(description).toContain('Field validation errors:');
			expect(description).toContain('• board_id: is required');
			expect(description).toContain('• title: too long');
		});

		it('should handle error details without field names', () => {
			const errorData = {
				details: [{ reason: 'invalid value' }, { field: 'name', message: 'is required' }],
			};

			const description = (errorHandler as any).getErrorDescription(errorData);

			expect(description).toContain('• unknown field: invalid value');
			expect(description).toContain('• name: is required');
		});

		it('should handle single error message', () => {
			const errorData = {
				message: 'Invalid request format',
			};

			const description = (errorHandler as any).getErrorDescription(errorData);

			expect(description).toBe('Invalid request format');
		});

		it('should handle OAuth error_description', () => {
			const errorData = {
				error: 'invalid_token',
				error_description: 'The access token has expired',
			};

			const description = (errorHandler as any).getErrorDescription(errorData);

			expect(description).toBe('The access token has expired');
		});

		it('should return null for empty error data', () => {
			const description = (errorHandler as any).getErrorDescription(null);
			expect(description).toBeNull();

			const description2 = (errorHandler as any).getErrorDescription({});
			expect(description2).toBeNull();
		});

		it('should handle empty details array', () => {
			const errorData = {
				details: [],
			};

			const description = (errorHandler as any).getErrorDescription(errorData);

			expect(description).toBeNull();
		});
	});

	describe('Edge cases and error scenarios', () => {
		it('should handle malformed error objects', () => {
			const malformedErrors = [null, undefined, 'string error', 123, { random: 'object' }];

			malformedErrors.forEach((error) => {
				const result = errorHandler.handleApiError(error);
				expect(result).toBeInstanceOf(NodeApiError);
				expect(result.httpCode).toBe('500');
				expect(result.message).toBe('The service was not able to process your request');
			});
		});

		it('should handle circular reference in error data', () => {
			const circularError: any = {
				response: {
					status: 400,
					data: {
						message: 'Circular reference test',
					},
				},
			};
			circularError.response.data.self = circularError;

			const result = errorHandler.handleApiError(circularError);

			expect(result).toBeInstanceOf(NodeApiError);
			expect(result.httpCode).toBe('400');
		});

		it('should handle very large error messages', () => {
			const largeMessage = 'x'.repeat(10000);
			const error = {
				response: {
					status: 400,
					data: {
						message: largeMessage,
					},
				},
			};

			const result = errorHandler.handleApiError(error);

			expect(result).toBeInstanceOf(NodeApiError);
			expect(result.message).toBe('Bad request - please check your parameters');
			expect(result.description).toContain(largeMessage);
		});

		it('should handle error with nested data structures', () => {
			const error = {
				response: {
					status: 400,
					data: {
						message: 'Validation failed',
						details: [
							{
								field: 'media_source',
								reason: 'invalid',
								nested: {
									subfield: 'url',
									subreason: 'malformed',
								},
							},
						],
					},
				},
			};

			const result = errorHandler.handleApiError(error);

			expect(result).toBeInstanceOf(NodeApiError);
			expect(result.description).toContain('media_source: invalid');
		});
	});
});
