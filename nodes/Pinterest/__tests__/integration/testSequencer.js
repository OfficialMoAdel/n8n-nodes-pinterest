/**
 * Custom test sequencer for Pinterest integration tests
 * Ensures tests run in optimal order to minimize API calls and rate limiting
 */

const Sequencer = require('@jest/test-sequencer').default;

class PinterestIntegrationSequencer extends Sequencer {
	sort(tests) {
		// Define test execution order to optimize API usage
		const testOrder = [
			'pinterest-api.integration.test.ts', // Basic API tests first
			'workflow.integration.test.ts', // Workflow tests second
			'performance.integration.test.ts', // Performance tests last
		];

		return tests.sort((testA, testB) => {
			const aIndex = testOrder.findIndex((name) => testA.path.includes(name));
			const bIndex = testOrder.findIndex((name) => testB.path.includes(name));

			// If both tests are in our order list, sort by order
			if (aIndex !== -1 && bIndex !== -1) {
				return aIndex - bIndex;
			}

			// If only one is in our list, prioritize it
			if (aIndex !== -1) return -1;
			if (bIndex !== -1) return 1;

			// For tests not in our list, use default sorting
			return testA.path.localeCompare(testB.path);
		});
	}
}

module.exports = PinterestIntegrationSequencer;
