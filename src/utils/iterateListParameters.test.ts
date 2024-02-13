import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { just } from './just';

describe('how iterateListParameters works', () => {
    it('should work with foo', () => {
        expect(
            iterateListParameters(
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
        );
    });

    it('should NOT work with bar', () => {
        expect(
            iterateListParameters(
                spaceTrim(`
                    bar
                `),
            ),
        ).toBe(false);
    });
});

/**
 * Function iterateListParameters will @@@
 *
 * @private within the library
 */
export function iterateListParameters(value: string): boolean {
    return value === 'Foo';
}

