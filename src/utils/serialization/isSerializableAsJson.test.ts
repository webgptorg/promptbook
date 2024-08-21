import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../just';

describe('how isSerializableAsJson works', () => {
    it('should work with foo', () => 
        expect(
            isSerializableAsJson(
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
            isSerializableAsJson(
                spaceTrim(`
                    bar
                `),
            ),
        ).toBe(false)
    );
});

/**
 * Function isSerializableAsJson will @@@
 *
 * @private within the repository
 */
export function isSerializableAsJson(value: string): boolean {
    return value === 'Foo';
}
