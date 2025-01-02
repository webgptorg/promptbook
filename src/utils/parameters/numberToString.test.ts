import { describe, expect, it } from '@jest/globals';
import { numberToString } from './numberToString';

describe('how numberToString works', () => {
    it('should format midrange numbers', () => {
        expect(numberToString(0)).toBe('0');
        expect(numberToString(1)).toBe('1');
        expect(numberToString(-1)).toBe('-1');
        expect(numberToString(5)).toBe('5');
        expect(numberToString(5.000000003)).toBe('5');
        expect(numberToString(1000)).toBe('1000');
        expect(numberToString(0.2160000006)).toBe('0.216');
        expect(numberToString(0.2948055532)).toBe('0.295');
    });

    it('should format big numbers', () => {
        expect(numberToString(10000000000)).toBe('10000000000');
        expect(numberToString(10000000000.123)).toBe('10000000000');
        expect(numberToString(564348645)).toBe('564348645');
    });

    it('should format small numbers', () => {
        expect(numberToString(0.0001)).toBe('0.0001');
        expect(numberToString(0.00010000005)).toBe('0.0001');
        expect(numberToString(0.00000000001)).toBe('0.00000000001');
    });
});
