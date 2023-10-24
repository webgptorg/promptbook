import { describe, expect, it } from '@jest/globals';
import { removeQuotes } from './removeQuotes';

describe('removeQuotes', () => {
    it('should keep unquoted string', () => {
        expect(removeQuotes('Hello')).toBe('Hello');
    });

    it('should remove single quotes', () => {
        expect(removeQuotes('\'Hello\'')).toBe('Hello');
    });

    it('should remove double quotes', () => {
        expect(removeQuotes('"Hello"')).toBe('Hello');
    });

    it('should NOT remove single quote from the beginning', () => {
        expect(removeQuotes('\'Hello')).toBe('\'Hello');
        expect(removeQuotes('"Hello')).toBe('"Hello');
    });

    it('should NOT remove single quote from the end', () => {
        expect(removeQuotes('Hello\'')).toBe('Hello\'');
        expect(removeQuotes('Hello"')).toBe('Hello"');
    });

    it('should NOT remove quote from the middle', () => {
        expect(removeQuotes('Hel\'lo')).toBe('Hel\'lo');
        expect(removeQuotes('Hel"lo')).toBe('Hel"lo');
    });
});
