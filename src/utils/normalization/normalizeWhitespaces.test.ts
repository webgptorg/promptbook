// test normalizeWhitespaces
import { normalizeWhitespaces } from '../src/normalizeWhitespaces';

describe('normalizeWhitespaces', () => {
    it('will normalize multiple whitespaces', () => {
        expect(normalizeWhitespaces(`foo            bar          baz`)).toEqual(
            `foo bar baz`,
        );
    });
    it('will normalize new lines', () => {
        expect(
            normalizeWhitespaces(
                `
                foo
                bar
                baz
                `,
            ),
        ).toEqual(`foo bar baz`);
    });

    it('will normalize tabs', () => {
        expect(normalizeWhitespaces(`foo\t\tbar          baz`)).toEqual(
            `foo bar baz`,
        );
    });
});
