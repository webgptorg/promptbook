import { describe, expect, it } from '@jest/globals';
import { pricing } from './pricing';

describe('how computeUsage works', () => {
    it('should compute a pricing', () => {
        expect(pricing(`$2.00 / 1M tokens`)).toBe(0.000002);
        expect(pricing(`$1.50 / 1M tokens`)).toBe(0.0000015);
        expect(pricing(`$5.00 / 1M tokens`)).toBe(0.000005);
        expect(pricing(`$30.00 / 1M tokens`)).toBe(0.00003);
    });
});
