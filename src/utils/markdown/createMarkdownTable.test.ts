import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { createMarkdownTable } from './createMarkdownTable';

describe('how createMarkdownTable works', () => {
    it('should work with 1x1 table', () => {
        expect(createMarkdownTable([[`Name`], [`Foo`]])).toBe(
            spaceTrim(`
                | Name |
                |------|
                | Foo  |
            `),
        );
    });

    it('should work with 1x2 table', () => {
        expect(
            createMarkdownTable([
                [`Name`, `Job`],
                [`Foo`, `Bar`],
            ]),
        ).toBe(
            spaceTrim(`
                | Name | Job |
                |------|-----|
                | Foo  | Bar |
            `),
        );
    });

    it('should work with 2x1 table', () => {
        expect(createMarkdownTable([[`Name`], [`Foo`], [`Bar`]])).toBe(
            spaceTrim(`
                | Name |
                |------|
                | Foo  |
                | Bar  |
            `),
        );
    });

    it('should work with 2x2 table', () => {
        expect(
            createMarkdownTable([
                [`Name`, `Job`],
                [`Foo`, `Bar`],
                [`Baz`, `Qux`],
            ]),
        ).toBe(
            spaceTrim(`
                | Name | Job |
                |------|-----|
                | Foo  | Bar |
                | Baz  | Qux |
            `),
        );
    });

    it('should work with 3x3 table', () => {
        expect(
            createMarkdownTable([
                [`Name`, `Job`, `Hobby`],
                [`Foo`, `Bar`, `Baz`],
                [`Qux`, `Quux`, `Corge`],
                [`Grault`, `Garply`, `Waldo`],
            ]),
        ).toBe(
            spaceTrim(`
                | Name   | Job    | Hobby |
                |--------|--------|-------|
                | Foo    | Bar    | Baz   |
                | Qux    | Quux   | Corge |
                | Grault | Garply | Waldo |
            `),
        );
    });

    it('should work with chart table', () => {
        expect(
            createMarkdownTable([
                ['Template', 'Time chart'],
                ['Template 1', '██████████░░'],
                ['Template 2', '░░░░██░░░░░░'],
                ['Template 3', '░░░██████░░░'],
                ['Template 4', '░░░░░░█████░'],
                ['Template 5', '░░░░░░░░░░░█'],
            ]),
        ).toBe(
            spaceTrim(`
                | Template   | Time chart   |
                |------------|--------------|
                | Template 1 | ██████████░░ |
                | Template 2 | ░░░░██░░░░░░ |
                | Template 3 | ░░░██████░░░ |
                | Template 4 | ░░░░░░█████░ |
                | Template 5 | ░░░░░░░░░░░█ |
            `),
        );
    });
});
