import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../just';

describe('how personaToModelRequirements works', () => {
    it('should work with simple', () =>
        expect(personaToModelRequirements(``)).resolves.toBe(
            just(
                spaceTrim(`
                  Foo

                  Bar

                  Baz
              `),
            ),
        ));

    it('should work with foo', () =>
        expect(
            personaToModelRequirements(
                spaceTrim(`
                    Foo

                    Bar

                    Baz
                `),
            ),
        ).resolves.toBe(
            just(
                spaceTrim(`
                    Foo

                    Bar

                    Baz
                `),
            ),
        ));

    it('should NOT work with bar', () =>
        expect(
            personaToModelRequirements(
                spaceTrim(`
                    bar
                `),
            ),
        ).rejects.toThrowError(/xxxx/));
});

/**
 * Function personaToModelRequirements will @@@
 *
 * @private within the package
 */
export function personaToModelRequirements(value: string): boolean {
    return value === 'Foo';
}
