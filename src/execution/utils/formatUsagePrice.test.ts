import { describe, expect, it } from '@jest/globals';
import { formatUsagePrice } from './formatUsagePrice';
import { UNCERTAIN_USAGE } from './usage-constants';

describe('formatUsagePrice', () => {
    it('shows tiny non-zero values as less than one cent', () => {
        const label = formatUsagePrice({
            ...UNCERTAIN_USAGE,
            price: { value: 0.0008 },
        });

        expect(label).toBe('<$0.01');
    });

    it('keeps uncertain prefix for tiny non-zero values', () => {
        const label = formatUsagePrice({
            ...UNCERTAIN_USAGE,
            price: { value: 0.0008, isUncertain: true },
        });

        expect(label).toBe('~<$0.01');
    });
});
