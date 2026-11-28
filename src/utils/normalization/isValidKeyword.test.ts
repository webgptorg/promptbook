import { describe, expect, it } from '@jest/globals';
import { isValidKeyword } from './isValidKeyword';

describe('how validation of keyword works', () => {
    it('is valid keyword', () => {
        expect(isValidKeyword(`foo`)).toBe(true);
        expect(isValidKeyword(`bar`)).toBe(true);
        expect(isValidKeyword(`foobar`)).toBe(true);
    });

    it('is NOTvalid keyword', () => {
        expect(isValidKeyword(``)).toBe(false);
        expect(isValidKeyword(`  `)).toBe(false);
        expect(isValidKeyword(`foo bar`)).toBe(false);
        expect(isValidKeyword(`fůů`)).toBe(false);
    });
});
