import { describe, expect, it } from '@jest/globals';
import type { TODO } from '../types/typeAliases';
import { parseNumber } from './parseNumber';

describe('how parseNumber works', () => {
    it('should keeps number', () => {
        expect(parseNumber(0)).toBe(0);
        expect(parseNumber(-0)).toBe(0);
        expect(parseNumber(1)).toBe(1);
        expect(parseNumber(2)).toBe(2);
        expect(parseNumber(100)).toBe(100);
        expect(parseNumber(1000)).toBe(1000);
        expect(parseNumber(-2)).toBe(-2);
        expect(parseNumber(-100)).toBe(-100);
        expect(parseNumber(10.5)).toBe(10.5);
        expect(parseNumber(-11.11)).toBe(-11.11);
    });

    it('should parse number', () => {
        expect(parseNumber('0')).toBe(0);
        expect(parseNumber('1')).toBe(1);
        expect(parseNumber('2')).toBe(2);
        expect(parseNumber('100')).toBe(100);
        expect(parseNumber('1000')).toBe(1000);
        expect(parseNumber('-2')).toBe(-2);
        expect(parseNumber('-100')).toBe(-100);
        expect(parseNumber('10.5')).toBe(10.5);
        expect(parseNumber('-11.11')).toBe(-11.11);
        expect(parseNumber('+11.11')).toBe(11.11);
    });

    it('should parse Infinity', () => {
        expect(parseNumber('Infinity')).toBe(Infinity);
        expect(parseNumber('infinity')).toBe(Infinity);
        expect(parseNumber('-Infinity')).toBe(-Infinity);
        expect(parseNumber('♾')).toBe(Infinity);
        expect(parseNumber('-♾')).toBe(-Infinity);
        expect(parseNumber('+INFINITY')).toBe(Infinity);
        expect(parseNumber('-INFINITY')).toBe(-Infinity);
        expect(parseNumber('INF')).toBe(Infinity);
        expect(parseNumber('-INF')).toBe(-Infinity);
        expect(parseNumber(Infinity)).toBe(Infinity);
        expect(parseNumber(-Infinity)).toBe(-Infinity);
    });

    it('should parse non-trimmed value', () => {
        expect(parseNumber(' 0')).toBe(0);
        expect(parseNumber(' 1')).toBe(1);
        expect(parseNumber('2 ')).toBe(2);
        expect(parseNumber('  100  ')).toBe(100);
        expect(parseNumber('  1000  ')).toBe(1000);
        expect(parseNumber('\n-2')).toBe(-2);
        expect(parseNumber('-100\r\n')).toBe(-100);
        expect(parseNumber('10.5\t')).toBe(10.5);
        expect(parseNumber('     - 11.11 ')).toBe(-11.11);
    });

    it('should parse fractions', () => {
        expect(parseNumber('1/2')).toBe(0.5);
        expect(parseNumber('1/3')).toBe(0.3333333333333333);
        expect(parseNumber('1/4')).toBe(0.25);
        expect(parseNumber('1/5')).toBe(0.2);
        expect(parseNumber('1/6')).toBe(0.16666666666666666);
        expect(parseNumber('1/7')).toBe(0.14285714285714285);
        expect(parseNumber('-1/8')).toBe(-0.125);
        expect(parseNumber('2/5')).toBe(0.4);
    });

    it('should parse value with misc formatting', () => {
        expect(parseNumber('-11,11')).toBe(-11.11);
        expect(parseNumber('11e5')).toBe(1100000);
    });

    it('should NOT result in NaN', () => {
        expect(parseNumber('')).toBe(0);
        expect(parseNumber('-')).toBe(0);
        expect(parseNumber('NaN')).toBe(0);
        expect(parseNumber('null')).toBe(0);
        expect(parseNumber('undefined')).toBe(0);
        expect(parseNumber(NaN)).toBe(0);
        expect(parseNumber(null as TODO)).toBe(0);
        expect(parseNumber(undefined as TODO)).toBe(0);
    });

    it('should throw error on invalid entries', () => {
        expect(() => parseNumber('wtf')).toThrowError(/Unable to parse number/i);
        expect(() => parseNumber('abc')).toThrowError(/Unable to parse number/i);
        expect(() => parseNumber('123abc')).toThrowError(/Unable to parse number/i);
        expect(() => parseNumber('86abc123')).toThrowError(/Unable to parse number/i);
        expect(() => parseNumber('abc123')).toThrowError(/Unable to parse number/i);
        expect(() => parseNumber('abc123xyz')).toThrowError(/Unable to parse number/i);
        expect(() => parseNumber('1/0')).toThrowError(/Unable to parse number/i);
        expect(() => parseNumber('1.2.3')).toThrowError(/Unable to parse number/i);
        expect(() => parseNumber('1.2.3.4')).toThrowError(/Unable to parse number/i);
    });
});
