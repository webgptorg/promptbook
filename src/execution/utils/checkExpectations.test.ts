import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { checkExpectations } from './checkExpectations';

describe('how checkExpectations works', () => {
    it('should pass the expectations', () => {
        expect(() => checkExpectations({}, ``)).not.toThrow();
        expect(() => checkExpectations({ words: { min: 1, max: 5 } }, `Foo bar`)).not.toThrow();
        expect(() => checkExpectations({ words: { min: 1, max: 5 } }, `Foo bar baz`)).not.toThrow();
        expect(() => checkExpectations({ sentences: { min: 1, max: 1 } }, `Foo bar baz qux`)).not.toThrow();

        expect(() =>
            checkExpectations(
                {
                    paragraphs: { min: 1, max: 1 },
                },
                spaceTrim(`
                  Foo
                  Bar
                  Baz
              `),
            ),
        ).not.toThrow();
    });

    it('should fail the expectations', () => {
        expect(() => checkExpectations({ characters: { min: 1, max: 5 } }, ``)).toThrowError(
            /Expected at least 1 characters but got 0/,
        );
        expect(() => checkExpectations({ words: { min: 1, max: 5 } }, `Foo bar baz brr grr hoo`)).toThrowError(
            /Expected at most 5 words but got 6/,
        );
        expect(() => checkExpectations({ words: { min: 1, max: 5 } }, ``)).toThrowError(
            /Expected at least 1 words but got 0/,
        );
        expect(() => checkExpectations({ sentences: { min: 1, max: 1 } }, `Foo bar baz qux. And foo.`)).toThrowError(
            /Expected at most 1 sentences but got 2/,
        );

        expect(() =>
            checkExpectations(
                {
                    paragraphs: { min: 1, max: 1 },
                },
                spaceTrim(`
                Foo

                Bar

                Baz
            `),
            ),
        ).toThrowError(/Expected at most 1 paragraphs but got 3/);
    });
});
