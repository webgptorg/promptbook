import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../just';

describe('how `removePipelineCommand` works', () => {
    it('should work with foo', () =>
        expect(
            removePipelineCommand(
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
        )
    );

    it('should NOT work with bar', () =>
        expect(
            removePipelineCommand(
                spaceTrim(`
                    bar
                `),
            ),
        ).toBe(false)
    );
});

/**
 * Function `removePipelineCommand` will @@@
 *
 * @public exported from `@promptbook/core` <- Note: [👖] This utility is so tightly interconnected with the Promptbook that it is not exported as util but in core
 */
export function removePipelineCommand(value: string): boolean {
    // TODO: [main] !!! Implement the function
    return value === 'Foo';
}


/**
 * TODO: [main] !!! Extract `removePipelineCommand` to separate file
 */