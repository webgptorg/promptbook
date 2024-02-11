import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { createMarkdownTable } from './createMarkdownTable';

describe('how createMarkdownTable works', () => {
    it('should work with 0x0 table', () => {
        expect(createMarkdownTable([])).toBe(
            spaceTrim(`

            `),
        );
    });

    it('should work with 1x1 table', () => {
        expect(createMarkdownTable([[`Foo`]])).toBe(
            spaceTrim(`
                | Foo |
            `),
        );
    });

    it('should work with 1x2 table', () => {
        expect(createMarkdownTable([[`Foo`, `Bar`]])).toBe(
            spaceTrim(`
                | Foo | Bar |
            `),
        );
    });

    it('should work with 2x1 table', () => {
        expect(createMarkdownTable([[`Foo`], [`Bar`]])).toBe(
            spaceTrim(`
                | Foo |
                | Bar |
            `),
        );
    });

    it('should work with 2x2 table', () => {
        expect(
            createMarkdownTable([
                [`Foo`, `Bar`],
                [`Baz`, `Qux`],
            ]),
        ).toBe(
            spaceTrim(`
                | Foo | Bar |
                | Baz | Qux |
            `),
        );
    });

    it('should work with 3x3 table', () => {
        expect(
            createMarkdownTable([
                [`Foo`, `Bar`, `Baz`],
                [`Qux`, `Quux`, `Corge`],
                [`Grault`, `Garply`, `Waldo`],
            ]),
        ).toBe(
            spaceTrim(`
                | Foo    | Bar    | Baz   |
                | Qux    | Quux   | Corge |
                | Grault | Garply | Waldo |
            `),
        );
    });

    it('should work with chart table', () => {
        expect(
            createMarkdownTable([
                ['Template 1', '🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦⬛⬛'],
                ['Template 2', '⬛⬛⬛⬛🟦🟦⬛⬛⬛⬛⬛⬛'],
                ['Template 3', '⬛⬛⬛🟦🟦🟦🟦🟦🟦⬛⬛⬛'],
                ['Template 4', '⬛⬛⬛⬛⬛⬛🟦🟦🟦🟦🟦⬛'],
                ['Template 5', '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛🟦'],
            ]),
        ).toBe(
            spaceTrim(`
                | Template 1 | 🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦⬛⬛ |
                | Template 2 | ⬛⬛⬛⬛🟦🟦⬛⬛⬛⬛⬛⬛ |
                | Template 3 | ⬛⬛⬛🟦🟦🟦🟦🟦🟦⬛⬛⬛ |
                | Template 4 | ⬛⬛⬛⬛⬛⬛🟦🟦🟦🟦🟦⬛ |
                | Template 5 | ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛🟦 |
            `),
        );
    });
});
