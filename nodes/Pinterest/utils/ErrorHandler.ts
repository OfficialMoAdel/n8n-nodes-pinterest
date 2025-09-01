import { NodeApiError, type INode } from 'n8n-workflow';

/**
 * Comprehensive Error Handler for Pinterest API errors
 * Provides specific error handling for different HTTP status codes with user-friendly messages
 */
export class ErrorHandler {
	constructor(private node: INode) {}

	/**
	 * Handle Pinterest API errors and convert to n8n NodeApiError
	 * @param error Raw error from API request
	 */
	handleApiError(error: any): NodeApiError {
		// Handle null/undefined errors
		if (!error) {
			return this.handleUnknownError(500, {});
		}

		const statusCode = error.response?.status || error.status || 500;
		const errorData = error.response?.data || error.data || {};

		switch (statusCode) {
			case 400:
				return this.handleBadRequestError(errorData);
			case 401:
				return this.handleUnauthorizedError(errorData);
			case 403:
				return this.handleForbiddenError(errorData);
			case 404:
				return this.handleNotFoundError(errorData);
			case 429:
				return this.handleRateLimitError(errorData);
			case 500:
			case 502:
			case 503:
			case 504:
				return this.handleServerError(statusCode, errorData);
			default:
				return this.handleUnknownError(statusCode, errorData);
		}
	}

	/**
	 * Handle 400 Bad Request errors
	 */
	private handleBadRequestError(errorData: any): NodeApiError {
		const message = errorData.message || 'Bad Request: Invalid request parameters';
		const description =
			this.getErrorDescription(errorData) ||
			'Please check your input parameters. Common issues include:\n' +
				'• Missing required fields (board_id, media_source)\n' +
				'• Invalid field values or formats\n' +
				'• Malformed URLs or file uploads\n' +
				'• Invalid privacy settings or board permissions';

		return new NodeApiError(this.node, {
			message: `Bad Request: ${message}`,
			description,
			httpCode: '400',
		});
	}

	/**
	 * Handle 401 Unauthorized errors
	 */
	private handleUnauthorizedError(errorData: any): NodeApiError {
		const message = 'Authentication failed: Please check your Pinterest credentials';
		const description =
			'Your access token may have expired or is invalid. Please try:\n' +
			'• Reconnecting your Pinterest account in the credentials\n' +
			'• Ensuring your Pinterest app has the required permissions\n' +
			'• Checking that continuous refresh tokens are enabled\n' +
			'• Verifying your client ID and secret are correct';

		return new NodeApiError(this.node, {
			message,
			description,
			httpCode: '401',
		});
	}

	/**
	 * Handle 403 Forbidden errors
	 */
	private handleForbiddenError(errorData: any): NodeApiError {
		const message = 'Forbidden: Insufficient permissions for this operation';
		const description =
			'Your Pinterest account lacks the required permissions. Please check:\n' +
			'• Your Pinterest app has the necessary scopes enabled\n' +
			'• You have permission to access the requested board or pin\n' +
			'• The board or pin privacy settings allow your access level\n' +
			'• Your account type supports the requested operation\n' +
			'• For secret boards, ensure you have boards:read_secret scope';

		return new NodeApiError(this.node, {
			message,
			description,
			httpCode: '403',
		});
	}

	/**
	 * Handle 404 Not Found errors
	 */
	private handleNotFoundError(errorData: any): NodeApiError {
		const message = errorData.message || 'Resource not found';
		const description =
			'The requested resource could not be found. Please verify:\n' +
			'• Pin ID, Board ID, or User ID is correct and exists\n' +
			"• The resource hasn't been deleted or made private\n" +
			'• You have permission to access the resource\n' +
			'• The resource belongs to your account or is publicly accessible';

		return new NodeApiError(this.node, {
			message: `Not Found: ${message}`,
			description,
			httpCode: '404',
		});
	}

	/**
	 * Handle 429 Rate Limit errors
	 */
	private handleRateLimitError(errorData: any): NodeApiError {
		const message = 'Rate limit exceeded';
		const description =
			'Pinterest API rate limit has been exceeded (1000 requests/hour). Please:\n' +
			'• Wait for the rate limit to reset (check X-RateLimit-Reset header)\n' +
			'• Reduce the frequency of your requests\n' +
			'• Consider implementing delays between operations\n' +
			'• Use batch operations where possible to minimize API calls\n' +
			'• The node will automatically retry after the reset period';

		return new NodeApiError(this.node, {
			message,
			description,
			httpCode: '429',
		});
	}

	/**
	 * Handle 5xx Server errors
	 */
	private handleServerError(statusCode: number, errorData: any): NodeApiError {
		const message = 'Pinterest API server error';
		const description =
			'Pinterest is experiencing technical difficulties. This is usually temporary:\n' +
			'• Try again in a few minutes\n' +
			"• Check Pinterest's status page for known issues\n" +
			'• The request will be automatically retried\n' +
			'• If the problem persists, contact Pinterest support';

		return new NodeApiError(this.node, {
			message: `${message} (${statusCode})`,
			description,
			httpCode: statusCode.toString(),
		});
	}

	/**
	 * Handle unknown errors
	 */
	private handleUnknownError(statusCode: number, errorData: any): NodeApiError {
		const message = errorData.message || 'Unknown error occurred';
		const description =
			'An unexpected error occurred while communicating with Pinterest:\n' +
			'• Check your internet connection\n' +
			'• Verify Pinterest API is accessible\n' +
			'• Try the operation again\n' +
			"• If the problem persists, check Pinterest's API documentation";

		return new NodeApiError(this.node, {
			message: `Unknown Error (${statusCode}): ${message}`,
			description,
			httpCode: statusCode.toString(),
		});
	}

	/**
	 * Get user-friendly error description from Pinterest API error
	 * @param errorData Pinterest API error data
	 */
	private getErrorDescription(errorData: any): string | null {
		if (!errorData) return null;

		// Handle Pinterest API error details format
		if (errorData.details && Array.isArray(errorData.details)) {
			const fieldErrors = errorData.details
				.map((detail: any) => {
					const field = detail.field || 'unknown field';
					const reason = detail.reason || detail.message || 'invalid value';
					return `• ${field}: ${reason}`;
				})
				.join('\n');

			return fieldErrors ? `Field validation errors:\n${fieldErrors}` : null;
		}

		// Handle single error message
		if (errorData.message && typeof errorData.message === 'string') {
			return errorData.message;
		}

		// Handle error_description field (OAuth errors)
		if (errorData.error_description) {
			return errorData.error_description;
		}

		return null;
	}

	/**
	 * Check if error is retryable
	 * @param error Error to check
	 */
	isRetryableError(error: any): boolean {
		const statusCode = error.response?.status || error.status;

		// Retryable status codes
		const retryableStatusCodes = [
			408, // Request Timeout
			429, // Too Many Requests
			500, // Internal Server Error
			502, // Bad Gateway
			503, // Service Unavailable
			504, // Gateway Timeout
		];

		// Network errors (no status code)
		if (
			!statusCode &&
			(error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')
		) {
			return true;
		}

		return retryableStatusCodes.includes(statusCode);
	}

	/**
	 * Get retry delay for retryable errors with exponential backoff
	 * @param attempt Current retry attempt number (0-based)
	 */
	getRetryDelay(attempt: number): number {
		// Base delay of 1 second, exponential backoff with jitter
		const baseDelay = 1000;
		const maxDelay = 30000; // 30 seconds max
		const exponentialDelay = baseDelay * Math.pow(2, attempt);

		// Add jitter to prevent thundering herd
		const jitter = Math.random() * 0.1 * exponentialDelay;
		const totalDelay = exponentialDelay + jitter;

		return Math.min(totalDelay, maxDelay);
	}

	/**
	 * Get maximum retry attempts for different error types
	 * @param error Error to check
	 */
	getMaxRetryAttempts(error: any): number {
		const statusCode = error.response?.status || error.status;

		switch (statusCode) {
			case 429: // Rate limit - retry more times with longer delays
				return 5;
			case 500:
			case 502:
			case 503:
			case 504: // Server errors - retry a few times
				return 3;
			default: // Network errors
				return 2;
		}
	}

	/**
	 * Check if error indicates Pinterest API is down
	 * @param error Error to check
	 */
	isPinterestApiDown(error: any): boolean {
		const statusCode = error.response?.status || error.status;
		return statusCode >= 500 && statusCode <= 599;
	}

	/**
	 * Extract rate limit information from error headers
	 * @param error Error with response headers
	 */
	extractRateLimitInfo(error: any): { limit?: number; remaining?: number; reset?: number } | null {
		const headers = error.response?.headers;
		if (!headers) return null;

		return {
			limit: headers['x-ratelimit-limit'] ? parseInt(headers['x-ratelimit-limit']) : undefined,
			remaining: headers['x-ratelimit-remaining']
				? parseInt(headers['x-ratelimit-remaining'])
				: undefined,
			reset: headers['x-ratelimit-reset'] ? parseInt(headers['x-ratelimit-reset']) : undefined,
		};
	}
}
