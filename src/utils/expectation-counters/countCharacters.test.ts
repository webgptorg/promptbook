import { describe, expect, it } from '@jest/globals';
import { countCharacters } from './countCharacters';

describe('countCharacters', () => {
    it('should return 0 for an empty string', () => {
        expect(countCharacters('')).toBe(0);
    });

    it('should return the correct count for a string with one character', () => {
        expect(countCharacters('a')).toBe(1);
        expect(countCharacters('1')).toBe(1);
    });

    it('should return the correct count for a string with multiple characters', () => {
        expect(countCharacters('Hello')).toBe(5);
    });

    it('should return the correct count for a string with special characters', () => {
        expect(countCharacters('Hello!')).toBe(6);
    });

    it('should return the correct count for a string with whitespace characters', () => {
        expect(countCharacters('Hello world')).toBe(11);
        expect(countCharacters('Hello\nworld')).toBe(11);
    });
});
