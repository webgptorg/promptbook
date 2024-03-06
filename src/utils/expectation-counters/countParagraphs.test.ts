import { describe, expect, it } from '@jest/globals';
import { countParagraphs } from './countParagraphs';

describe('countParagraphs', () => {
    it('should return 0 for an empty string', () => {
        expect(countParagraphs('')).toBe(0);
    });

    it('should return the correct count for a string with one paragraph', () => {
        expect(countParagraphs('This is a paragraph.')).toBe(1);
    });

    it('should return the correct count for a string with multiple paragraphs', () => {
        expect(countParagraphs('This is paragraph 1.\n\nThis is paragraph 2.')).toBe(2);
    });

    it('should return the correct count for a string with leading/trailing whitespace', () => {
        expect(countParagraphs('   This is a paragraph.   ')).toBe(1);
    });
});
