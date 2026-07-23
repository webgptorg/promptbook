import type { Usage } from '../../../src/execution/Usage';
import { ZERO_USAGE } from '../../../src/execution/utils/usage-constants';
import type { CoderRunStep } from '../common/CoderRunStep';
import { formatCoderRunSteps } from './formatCoderRunSteps';

/**
 * Number of milliseconds in one hour, used to build readable step durations in these tests.
 */
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Builds a usage record with a concrete, certain price for the step-formatting tests.
 */
function createUsageWithPrice(price: number): Usage {
    return { ...ZERO_USAGE, price: { value: price } };
}

describe('formatCoderRunSteps', () => {
    it('renders each step with its label, price and duration joined by "; "', () => {
        const steps: ReadonlyArray<CoderRunStep> = [
            { kind: 'implementation', usage: createUsageWithPrice(8.01), durationMs: 6 * ONE_HOUR_MS },
            { kind: 'testing', usage: null, durationMs: 2 * ONE_HOUR_MS },
            { kind: 'fixing', usage: createUsageWithPrice(3.14), durationMs: 3 * ONE_HOUR_MS },
        ];

        expect(formatCoderRunSteps(steps)).toBe('Implementation $8.01 6 hours; Testing 2 hours; Fixing $3.14 3 hours');
    });

    it('omits the price for steps without model usage such as testing', () => {
        const steps: ReadonlyArray<CoderRunStep> = [{ kind: 'testing', usage: null, durationMs: 2 * ONE_HOUR_MS }];

        expect(formatCoderRunSteps(steps)).toBe('Testing 2 hours');
    });

    it('renders a single implementation step without any separator', () => {
        const steps: ReadonlyArray<CoderRunStep> = [
            { kind: 'implementation', usage: createUsageWithPrice(8.01), durationMs: 6 * ONE_HOUR_MS },
        ];

        expect(formatCoderRunSteps(steps)).toBe('Implementation $8.01 6 hours');
    });

    it('returns an empty string when there are no steps', () => {
        expect(formatCoderRunSteps([])).toBe('');
    });
});
