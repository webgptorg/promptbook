import { describe, expect, it } from '@jest/globals';
import { computeUsage } from './computeUsage';

describe('how computeUsage works', () => {
    it('should compute a usage', () => {
        expect(computeUsage(`$2.00 / 1M tokens`)).toBe(0.000002);
        expect(computeUsage(`$1.50 / 1M tokens`)).toBe(0.0000015);
        expect(computeUsage(`$5.00 / 1M tokens`)).toBe(0.000005);
        expect(computeUsage(`$30.00 / 1M tokens`)).toBe(0.00003);
    });
});
