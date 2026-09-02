import { UnexpectedError } from '../../../../src/errors/UnexpectedError';
import type { ModelPricingTable } from './modelPricing';
import { resolveModelPricing } from './modelPricing';

/**
 * Pricing table used by the tests of `resolveModelPricing`.
 */
const TESTED_PRICING_TABLE = {
    'test-flash': { input: 1, output: 2 },
    'test-pro': { input: 3, output: 4 },
} as const satisfies ModelPricingTable;

describe('resolveModelPricing', () => {
    it('returns exact model pricing when available', () => {
        expect(
            resolveModelPricing({
                pricingTable: TESTED_PRICING_TABLE,
                modelNameForEstimation: 'test-flash',
                modelName: 'test-pro',
            }),
        ).toEqual(TESTED_PRICING_TABLE['test-pro']);
    });

    it('returns prefix match pricing for model variants', () => {
        expect(
            resolveModelPricing({
                pricingTable: TESTED_PRICING_TABLE,
                modelNameForEstimation: 'test-flash',
                modelName: 'test-pro-preview-0409',
            }),
        ).toEqual(TESTED_PRICING_TABLE['test-pro']);
    });

    it('falls back to the estimation model for unknown models', () => {
        expect(
            resolveModelPricing({
                pricingTable: TESTED_PRICING_TABLE,
                modelNameForEstimation: 'test-flash',
                modelName: 'completely-unknown',
            }),
        ).toEqual(TESTED_PRICING_TABLE['test-flash']);
    });

    it('throws when the estimation model is missing from the pricing table', () => {
        expect(() =>
            resolveModelPricing({
                pricingTable: TESTED_PRICING_TABLE,
                modelNameForEstimation: 'not-in-the-table',
            }),
        ).toThrow(UnexpectedError);
    });
});
