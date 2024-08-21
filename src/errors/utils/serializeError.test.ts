import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../just';
import { serializeError } from './serializeError';

describe('how `serializeError` works', () => {
    it('should work with foo', () =>
        expect(
            serializeError(
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
            serializeError(
                spaceTrim(`
                    bar
                `),
            ),
        ).toBe(false));
});
