import { describe, expect, it } from '@jest/globals';
import { countLines } from './countLines';

describe('countLines', () => {
    it('should return 0 for an empty string', () => {
        expect(countLines('')).toBe(0);
    });

    it('should return the correct count for a string with one line', () => {
        expect(countLines(' ')).toBe(1);
        expect(countLines('   \t')).toBe(1);
        expect(countLines('Hello')).toBe(1);
    });

    it('should return the correct count for a string with multiple lines', () => {
        expect(countLines('Hello\nworld')).toBe(2);
        expect(countLines('Hello\nworld\n!')).toBe(3);
    });
});
