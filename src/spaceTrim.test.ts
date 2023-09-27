import { spaceTrim } from './spaceTrim';

// tslint:disable:no-trailing-whitespace
describe('how space trim works', () => {
    it('will not crash for empty string', () => {
        expect(spaceTrim('')).toBe('');
        expect(spaceTrim('  ')).toBe('');
        expect(spaceTrim(' \n  \n ')).toBe('');
        expect(spaceTrim(' \n  \n\n  \n\n  \n ')).toBe('');
    });

    it('will trim one sentence', () => {
        expect(spaceTrim(`  foo      `)).toBe('foo');
        expect(spaceTrim(`  foo bar     `)).toBe('foo bar');
        expect(spaceTrim(`  foo  bar      `)).toBe('foo  bar');
        expect(spaceTrim(`\n\n\n  foo      `)).toBe('foo');
        expect(
            spaceTrim(`\n\n\r  foo


        `),
        ).toBe('foo');
        expect(
            spaceTrim(`\t  foo


        `),
        ).toBe('foo');
    });

    it('will space trim', () => {
        expect(
            spaceTrim(`

                Hell1
                Space
                Trim


        `),
        ).toBe(['Hell1', 'Space', 'Trim'].join('\n'));
    });

    it('will space trim with 2 zig-zag lines', () => {
        expect(
            spaceTrim(`
            Hell2
        Space
    `),
        ).toBe(['    Hell2', 'Space'].join('\n'));
    });

    it('will space trim with 3 zig-zag lines', () => {
        expect(
            spaceTrim(`

              Hell3
          Space${'                                            '}
              Trim${'                                            '}




      `),
        ).toBe(['    Hell3', 'Space    ', '    Trim '].join('\n'));
    });

    it('will space trim with 5 zig-zag lines', () => {
        expect(
            spaceTrim(`

            Hell5
        Space
            Trim
              Moooore${'                 '}
                        Words


    `),
        ).toBe(
            [
                '    Hell5',
                'Space',
                '    Trim',
                '      Moooore        ',
                '                Words',
            ].join('\n'),
        );
    });

    it('will preserve white lines inside', () => {
        expect(
            spaceTrim(`

                Hell9
                Space

                ${'     '}
                ${'  '}
                Trim


        `),
        ).toBe(['Hell9', 'Space', '', '     ', '  ', 'Trim'].join('\n'));
    });

    // TODO it('can space trim with tabs', () => {
    // TODO it('can space trim with \n and \r and both ', () => {
});
