import { describe, expect, it } from '@jest/globals';
import { VALUE_STRINGS } from '../../config';
import { valueToString } from './valueToString';

describe('how `valueToString` works', () => {
    it('should work with strings', () => {
        expect(valueToString(``)).toBe(VALUE_STRINGS.empty);
        expect(valueToString(`foo`)).toBe(`foo`);
        expect(valueToString(`bar`)).toBe(`bar`);
    });

    it('should work with numbers', () => {
        expect(valueToString(1)).toBe(`1`);
        // Note: For advanced formatting, see `numberToString` tests
    });

    it('should work with `null` and `undefined`', () => {
        expect(valueToString(null)).toBe(VALUE_STRINGS.null);
        expect(valueToString(undefined)).toBe(VALUE_STRINGS.undefined);
    });

    it('should work with booleans', () => {
        expect(valueToString(true)).toBe('true');
        expect(valueToString(false)).toBe('false');
    });

    it('should work with arrays', () => {
        expect(valueToString([])).toBe('(empty array)');
        expect(valueToString(['apple', 'banana', 'cherry'])).toBe('apple, banana, cherry');
        expect(valueToString([1, 2, 3])).toBe('1, 2, 3');
        expect(valueToString([1, 'two', 3])).toBe('1, two, 3');
        expect(valueToString([{ name: 'John' }, { name: 'Jane' }])).toBe('[{"name":"John"},{"name":"Jane"}]');
    });

    it('should work with objects', () => {
        expect(valueToString({ name: 'John', age: 30 })).toBe('{"name":"John","age":30}');
        expect(valueToString({ foo: 'bar' })).toBe('{"foo":"bar"}');
    });

    it('should handle dates', () => {
        const date = new Date('2024-01-15T10:30:00.000Z');
        expect(valueToString(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle circular references', () => {
        const circular: any = { a: 1 };
        circular.self = circular;
        expect(valueToString(circular)).toBe(VALUE_STRINGS.circular);
    });

    it('should handle complex nested objects', () => {
        const complex = {
            user: {
                name: 'John',
                age: 30,
                hobbies: ['reading', 'coding'],
            },
        };
        expect(valueToString(complex)).toBe('{"user":{"name":"John","age":30,"hobbies":["reading","coding"]}}');
    });

    /*
    TODO: Some clever way how to convert objects to LLM-friendly strings
    it('should work with objects', () =>
        expect(
            valueToString(
                spaceTrim(`
                    Foo

                    Bar

                    Baz
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo

                    Bar

                    Baz
                `),
            ),
        ));
      */
});
