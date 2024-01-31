import { describe, expect, it } from '@jest/globals';
import { countSentences } from './countSentences';

describe('countSentences', () => {
    it('should return 0 for an empty string', () => {
        expect(countSentences('')).toBe(0);
        expect(countSentences('    ')).toBe(0);
        expect(countSentences('\n\n')).toBe(0);
        expect(countSentences('  \n  \n')).toBe(0);
    });

    it('should return the correct count for a string with one sentence', () => {
        expect(countSentences('Hello.')).toBe(1);
        expect(countSentences('This is a sentence.')).toBe(1);
    });

    it('should return the correct count for a string with multiple sentences', () => {
        expect(countSentences('Hello. How are you?')).toBe(2);
        expect(countSentences('This is a sentence. This is another sentence.')).toBe(2);
    });

    it('should return the correct count for a string with special characters', () => {
        expect(countSentences('Hello! How are you?')).toBe(2);
        expect(countSentences('This is a sentence. This is another sentence!')).toBe(2);
    });

    it('should return the correct count for a string with whitespace characters', () => {
        expect(countSentences('Hello world. How are you?')).toBe(2);
        expect(countSentences('This is a sentence.\nThis is another sentence.')).toBe(2);
    });
});
