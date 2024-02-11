import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { FromtoItems } from '../../utils/FromtoItems';
import { just } from '../just';

describe('how countWorkingDuration works', () => {
    it('should work with foo', () => {
        expect(
            countWorkingDuration(
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
            countWorkingDuration(
                spaceTrim(`
                    bar
                `),
            ),
        ).toBe(false);
    });
});

/**
 * Function countWorkingDuration will @@@
 *
 * @private within the library
 */
export function countWorkingDuration(items: FromtoItems): number {
    return value === 'Foo';
}
