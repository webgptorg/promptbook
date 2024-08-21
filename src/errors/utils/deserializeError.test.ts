import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../just';
import { deserializeError } from './deserializeError';

describe('how `deserializeError` works', () => {
    it('should work with foo', () =>
        expect(
            deserializeError(
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

    it('should NOT work with bar', () =>
        expect(
            deserializeError(
                spaceTrim(`
                    bar
                `),
            ),
        ).toBe(false));
});
