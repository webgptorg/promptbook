import { spaceTrim } from 'spacetrim';
// test normalizeWhitespaces
import { describe, expect, it } from '@jest/globals';
import { normalizeWhitespaces } from './normalizeWhitespaces';

describe('normalizeWhitespaces', () => {
    it('will normalize multiple whitespaces', () => {
        expect(normalizeWhitespaces(`foo            bar          baz`)).toEqual(`foo bar baz`);
    });
    it('will normalize new lines', () => {
        expect(
            normalizeWhitespaces(
                spaceTrim(`
                foo
                bar
                baz
                `),
            ),
        ).toEqual(`foo bar baz`);
    });

    it('will normalize tabs', () => {
        expect(normalizeWhitespaces(`foo\t\tbar          baz`)).toEqual(`foo bar baz`);
    });
});
