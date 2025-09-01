/**
 * Performance benchmarking utilities for Pinterest integration tests
 */

import { integrationConfig } from './config';

export interface PerformanceMetrics {
	operation: string;
	startTime: number;
	endTime: number;
	duration: number;
	success: boolean;
	error?: string;
	requestSize?: number;
	responseSize?: number;
}

export interface BenchmarkResults {
	totalOperations: number;
	successfulOperations: number;
	failedOperations: number;
	averageResponseTime: number;
	minResponseTime: number;
	maxResponseTime: number;
	p95ResponseTime: number;
	throughput: number; // operations per second
	metrics: PerformanceMetrics[];
}

export class PerformanceBenchmark {
	private metrics: PerformanceMetrics[] = [];

	/**
	 * Start timing an operation
	 */
	startOperation(operation: string): PerformanceTimer {
		return new PerformanceTimer(operation, this);
	}

	/**
	 * Record a completed operation
	 */
	recordOperation(metric: PerformanceMetrics): void {
		this.metrics.push(metric);
	}

	/**
	 * Get benchmark results
	 */
	getResults(): BenchmarkResults {
		if (this.metrics.length === 0) {
			return {
				totalOperations: 0,
				successfulOperations: 0,
				failedOperations: 0,
				averageResponseTime: 0,
				minResponseTime: 0,
				maxResponseTime: 0,
				p95ResponseTime: 0,
				throughput: 0,
				metrics: [],
			};
		}

		const successfulMetrics = this.metrics.filter((m) => m.success);
		const durations = successfulMetrics.map((m) => m.duration).sort((a, b) => a - b);

		const totalDuration =
			Math.max(...this.metrics.map((m) => m.endTime)) -
			Math.min(...this.metrics.map((m) => m.startTime));

		return {
			totalOperations: this.metrics.length,
			successfulOperations: successfulMetrics.length,
			failedOperations: this.metrics.length - successfulMetrics.length,
			averageResponseTime:
				durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
			minResponseTime: durations.length > 0 ? Math.min(...durations) : 0,
			maxResponseTime: durations.length > 0 ? Math.max(...durations) : 0,
			p95ResponseTime: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
			throughput: totalDuration > 0 ? (this.metrics.length / totalDuration) * 1000 : 0,
			metrics: [...this.metrics],
		};
	}
	/**
	 * Validate performance against requirements
	 */
	validatePerformance(): { passed: boolean; issues: string[] } {
		const results = this.getResults();
		const issues: string[] = [];

		// Check average response time
		if (results.averageResponseTime > integrationConfig.performance.maxResponseTime) {
			issues.push(
				`Average response time ${results.averageResponseTime}ms exceeds limit of ${integrationConfig.performance.maxResponseTime}ms`,
			);
		}

		// Check P95 response time
		if (results.p95ResponseTime > integrationConfig.performance.maxResponseTime * 1.5) {
			issues.push(`P95 response time ${results.p95ResponseTime}ms exceeds acceptable limit`);
		}

		// Check success rate
		const successRate =
			results.totalOperations > 0 ? results.successfulOperations / results.totalOperations : 0;
		if (successRate < 0.95) {
			issues.push(`Success rate ${(successRate * 100).toFixed(1)}% is below 95% threshold`);
		}

		return {
			passed: issues.length === 0,
			issues,
		};
	}

	/**
	 * Clear all metrics
	 */
	clear(): void {
		this.metrics = [];
	}

	/**
	 * Export metrics to JSON for analysis
	 */
	exportMetrics(): string {
		return JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				config: integrationConfig.performance,
				results: this.getResults(),
			},
			null,
			2,
		);
	}
}

export class PerformanceTimer {
	private startTime: number;

	constructor(
		private operation: string,
		private benchmark: PerformanceBenchmark,
	) {
		this.startTime = Date.now();
	}

	/**
	 * End timing and record the operation
	 */
	end(success: boolean, error?: string, requestSize?: number, responseSize?: number): void {
		const endTime = Date.now();

		this.benchmark.recordOperation({
			operation: this.operation,
			startTime: this.startTime,
			endTime,
			duration: endTime - this.startTime,
			success,
			error,
			requestSize,
			responseSize,
		});
	}
}
