import { describe, expect, it } from '@jest/globals';
import { formatNumber } from './formatNumber';

describe('how formatNumber works', () => {
    it('should format midrange numbers', () => {
        expect(formatNumber(0)).toBe('0');
        expect(formatNumber(1)).toBe('1');
        expect(formatNumber(-1)).toBe('-1');
        expect(formatNumber(5)).toBe('5');
        expect(formatNumber(5.000000003)).toBe('5');
        expect(formatNumber(1000)).toBe('1000');
        expect(formatNumber(0.2160000006)).toBe('0.216');
        expect(formatNumber(0.2948055532)).toBe('0.295');
    });

    it('should format big numbers', () => {
        expect(formatNumber(10000000000)).toBe('10000000000');
        expect(formatNumber(10000000000.123)).toBe('10000000000');
        expect(formatNumber(564348645)).toBe('564348645');
    });

    it('should format small numbers', () => {
        expect(formatNumber(0.0001)).toBe('0.0001');
        expect(formatNumber(0.00010000005)).toBe('0.0001');
        expect(formatNumber(0.00000000001)).toBe('0.00000000001');
    });
});
