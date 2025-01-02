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
