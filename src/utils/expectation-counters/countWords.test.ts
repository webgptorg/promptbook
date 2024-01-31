import { describe, expect, it } from '@jest/globals';
import { countWords } from './countWords';

describe('countWords', () => {
    it('should return 0 for an empty string', () => {
        expect(countWords('')).toBe(0);
    });

    it('should return the correct count for a string with one word', () => {
        expect(countWords('Hello')).toBe(1);
        expect(countWords('World')).toBe(1);
    });

    it('should return the correct count for a string with multiple words', () => {
        expect(countWords('Hello World')).toBe(2);
        expect(countWords('Count the words')).toBe(3);
    });

    it('should ignore leading and trailing whitespace', () => {
        expect(countWords('  Hello  ')).toBe(1);
        expect(countWords('  Count the words  ')).toBe(3);
    });

    it('should handle special characters and punctuation', () => {
        expect(countWords('Hello, World!')).toBe(2);
        expect(countWords('Count the words...')).toBe(3);
    });

    it('should handle newlines and tabs', () => {
        expect(countWords('Hello\nWorld')).toBe(2);
        expect(countWords('Count\tthe\twords')).toBe(3);
    });
});
