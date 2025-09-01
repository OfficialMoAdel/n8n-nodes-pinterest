import { RateLimiter } from '../RateLimiter';
import type { RateLimitInfo } from '../types';

describe('RateLimiter', () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		rateLimiter = new RateLimiter();
		jest.clearAllTimers();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	describe('Constructor', () => {
		it('should initialize with default values', () => {
			const info = rateLimiter.getRateLimitInfo();
			expect(info.limit).toBe(1000);
			expect(info.remaining).toBe(1000);
			expect(rateLimiter.getQueueLength()).toBe(0);
		});
	});

	describe('checkLimit', () => {
		it('should allow requests under normal conditions', async () => {
			await rateLimiter.checkLimit();

			const info = rateLimiter.getRateLimitInfo();
			expect(info.remaining).toBe(999);
			expect(info.limit).toBe(1000);
		});

		it('should enforce minimum interval between requests', async () => {
			const promise1 = rateLimiter.checkLimit();
			await promise1;

			// Second request should be delayed due to minimum interval
			const promise2 = rateLimiter.checkLimit();

			let resolved = false;
			promise2.then(() => {
				resolved = true;
			});

			// Should be pending due to minimum interval
			await Promise.resolve();
			expect(resolved).toBe(false);

			// Advance past minimum interval
			jest.advanceTimersByTime(100);
			await promise2;
		});

		it('should handle progressive delay calculation', () => {
			// Test the progressive delay calculation directly
			const calculateProgressiveDelay = rateLimiter['calculateProgressiveDelay'].bind(rateLimiter);

			// At warning threshold (90%), delay should be 0
			expect(calculateProgressiveDelay(0.9)).toBe(0);

			// At critical threshold (95%), delay should be maximum (5000ms)
			expect(calculateProgressiveDelay(0.95)).toBe(5000);

			// Between thresholds should have some delay
			const midDelay = calculateProgressiveDelay(0.925);
			expect(midDelay).toBeGreaterThan(0);
			expect(midDelay).toBeLessThan(5000);
		});

		it('should reset counter when window expires', async () => {
			// Set up expired window
			rateLimiter['requestCount'] = 1000;
			rateLimiter['resetTime'] = Date.now() - 1000; // 1 second ago

			await rateLimiter.checkLimit();

			const info = rateLimiter.getRateLimitInfo();
			expect(info.remaining).toBe(999); // Should have reset and consumed 1
		});
	});

	describe('updateFromHeaders', () => {
		it('should update rate limit info from valid headers', () => {
			// Use a future timestamp to avoid reset logic
			const futureTimestamp = Math.floor((Date.now() + 3600000) / 1000); // 1 hour from now

			const headers = {
				'x-ratelimit-remaining': '950',
				'x-ratelimit-reset': futureTimestamp.toString(),
				'x-ratelimit-limit': '1000',
			};

			rateLimiter.updateFromHeaders(headers);

			const info = rateLimiter.getRateLimitInfo();
			expect(info.remaining).toBe(950);
			expect(info.limit).toBe(1000);
			expect(info.reset).toBe(futureTimestamp);
		});

		it('should handle missing headers gracefully', () => {
			const headers = {};

			rateLimiter.updateFromHeaders(headers);

			// Should not throw and maintain current state
			const info = rateLimiter.getRateLimitInfo();
			expect(info.limit).toBe(1000);
		});

		it('should handle null/undefined headers', () => {
			expect(() => rateLimiter.updateFromHeaders(null)).not.toThrow();
			expect(() => rateLimiter.updateFromHeaders(undefined)).not.toThrow();
		});

		it('should handle invalid header values', () => {
			const headers = {
				'x-ratelimit-remaining': 'invalid',
				'x-ratelimit-reset': 'not-a-number',
				'x-ratelimit-limit': null,
			};

			expect(() => rateLimiter.updateFromHeaders(headers)).not.toThrow();
		});
	});

	describe('getRateLimitInfo', () => {
		it('should return current rate limit status', () => {
			rateLimiter['requestCount'] = 100;
			rateLimiter['resetTime'] = Date.now() + 3600000;

			const info = rateLimiter.getRateLimitInfo();

			expect(info.limit).toBe(1000);
			expect(info.remaining).toBe(900);
			expect(info.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
		});

		it('should return reset values when window has expired', () => {
			rateLimiter['requestCount'] = 1000;
			rateLimiter['resetTime'] = Date.now() - 1000; // Expired

			const info = rateLimiter.getRateLimitInfo();

			expect(info.limit).toBe(1000);
			expect(info.remaining).toBe(1000);
		});
	});

	describe('isApproachingLimit', () => {
		it('should return false when under warning threshold', () => {
			rateLimiter['requestCount'] = 800; // 80%
			expect(rateLimiter.isApproachingLimit()).toBe(false);
		});

		it('should return true when at or above warning threshold', () => {
			rateLimiter['requestCount'] = 900; // 90%
			expect(rateLimiter.isApproachingLimit()).toBe(true);

			rateLimiter['requestCount'] = 950; // 95%
			expect(rateLimiter.isApproachingLimit()).toBe(true);
		});
	});

	describe('isLimitExceeded', () => {
		it('should return false when under limit', () => {
			rateLimiter['requestCount'] = 999;
			rateLimiter['resetTime'] = Date.now() + 3600000;
			expect(rateLimiter.isLimitExceeded()).toBe(false);
		});

		it('should return true when limit is exceeded', () => {
			rateLimiter['requestCount'] = 1000;
			rateLimiter['resetTime'] = Date.now() + 3600000;
			expect(rateLimiter.isLimitExceeded()).toBe(true);
		});

		it('should return false when window has expired even if count is high', () => {
			rateLimiter['requestCount'] = 1000;
			rateLimiter['resetTime'] = Date.now() - 1000; // Expired
			expect(rateLimiter.isLimitExceeded()).toBe(false);
		});
	});

	describe('getTimeUntilReset', () => {
		it('should return correct time until reset', () => {
			const resetTime = Date.now() + 3600000; // 1 hour from now
			rateLimiter['resetTime'] = resetTime;

			const timeUntilReset = rateLimiter.getTimeUntilReset();
			expect(timeUntilReset).toBeCloseTo(3600000, -2); // Within 100ms
		});

		it('should return 0 when reset time has passed', () => {
			rateLimiter['resetTime'] = Date.now() - 1000; // 1 second ago

			const timeUntilReset = rateLimiter.getTimeUntilReset();
			expect(timeUntilReset).toBe(0);
		});
	});

	describe('reset', () => {
		it('should reset all internal state', () => {
			// Set up some state
			rateLimiter['requestCount'] = 500;
			rateLimiter['resetTime'] = Date.now() + 3600000;
			rateLimiter['requestQueue'] = [jest.fn(), jest.fn()];
			rateLimiter['isProcessingQueue'] = true;
			rateLimiter['lastRequestTime'] = Date.now();

			rateLimiter.reset();

			expect(rateLimiter['requestCount']).toBe(0);
			expect(rateLimiter['resetTime']).toBe(0);
			expect(rateLimiter.getQueueLength()).toBe(0);
			expect(rateLimiter['isProcessingQueue']).toBe(false);
			expect(rateLimiter['lastRequestTime']).toBe(0);
		});
	});

	describe('getQueueLength', () => {
		it('should return current queue length', () => {
			expect(rateLimiter.getQueueLength()).toBe(0);

			// Manually add to queue for testing
			rateLimiter['requestQueue'] = [jest.fn(), jest.fn()];
			expect(rateLimiter.getQueueLength()).toBe(2);
		});
	});

	describe('Header Parsing', () => {
		it('should parse various header formats correctly', () => {
			const parseHeaderValue = rateLimiter['parseHeaderValue'].bind(rateLimiter);

			expect(parseHeaderValue('100')).toBe(100);
			expect(parseHeaderValue(200)).toBe(200);
			expect(parseHeaderValue('0')).toBe(0);
			expect(parseHeaderValue('')).toBeNull();
			expect(parseHeaderValue('invalid')).toBeNull();
			expect(parseHeaderValue(null)).toBeNull();
			expect(parseHeaderValue(undefined)).toBeNull();
		});
	});

	describe('Queue Management', () => {
		it('should handle queue operations', () => {
			// Test that queue can be manipulated
			expect(rateLimiter.getQueueLength()).toBe(0);

			// Add mock functions to queue
			const mockFn1 = jest.fn();
			const mockFn2 = jest.fn();
			rateLimiter['requestQueue'].push(mockFn1, mockFn2);

			expect(rateLimiter.getQueueLength()).toBe(2);

			// Clear queue
			rateLimiter.reset();
			expect(rateLimiter.getQueueLength()).toBe(0);
		});

		it('should handle queue processing when limits allow', () => {
			// Set up a scenario where queue processing can happen
			rateLimiter['requestCount'] = 500; // Under limit
			rateLimiter['resetTime'] = Date.now() + 3600000;

			// Manually add a callback to queue
			let resolved = false;
			const mockResolve = () => {
				resolved = true;
			};
			rateLimiter['requestQueue'].push(mockResolve);

			// Verify queue has item
			expect(rateLimiter.getQueueLength()).toBe(1);

			// Trigger queue processing (synchronous part)
			rateLimiter['processQueue']();

			// Verify the callback was called
			expect(resolved).toBe(true);
		});
	});

	describe('Edge Cases and Integration', () => {
		it('should handle multiple requests without timing out', async () => {
			// Use real timers for this test to avoid timeout issues
			jest.useRealTimers();

			const promises = [];
			for (let i = 0; i < 5; i++) {
				promises.push(rateLimiter.checkLimit());
			}

			await Promise.all(promises);

			const info = rateLimiter.getRateLimitInfo();
			expect(info.remaining).toBe(995);
		}, 15000);

		it('should handle typical API usage pattern', async () => {
			// Use real timers for integration test
			jest.useRealTimers();

			// Simulate normal usage
			for (let i = 0; i < 10; i++) {
				await rateLimiter.checkLimit();
			}

			const info = rateLimiter.getRateLimitInfo();
			expect(info.remaining).toBe(990);
			expect(rateLimiter.isApproachingLimit()).toBe(false);
		}, 15000);

		it('should recover after rate limit reset', () => {
			// Exhaust rate limit
			rateLimiter['requestCount'] = 1000;
			rateLimiter['resetTime'] = Date.now() + 1000; // 1 second in future

			expect(rateLimiter.isLimitExceeded()).toBe(true);

			// Simulate time passing to reset
			jest.advanceTimersByTime(1001); // Advance past reset time

			// Should show reset state
			const info = rateLimiter.getRateLimitInfo();
			expect(info.remaining).toBe(1000); // Should be reset to full limit
		});
	});
});
