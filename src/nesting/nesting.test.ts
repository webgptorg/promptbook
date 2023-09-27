import { spaceTrim } from '../spaceTrim';

// tslint:disable:no-trailing-whitespace
describe('how nesting works', () => {
    it('will nest simple values ', () => {
        expect(
            spaceTrim(
                (block) => `

                  ${block('Hello')}

    `,
            ),
        ).toBe('Hello');
    });

    it('will nest values joined inside spaceTrim block', () => {
        expect(
            spaceTrim(
                (block) => `

                  Numbers
                  ${block(['1', '2', '3'].join('\n'))}
                  Chars
                  ${block(['A', 'B', 'C'].join('\n'))}


        `,
            ),
        ).toBe(['Numbers', '1', '2', '3', 'Chars', 'A', 'B', 'C'].join('\n'));
    });

    it('will nest values joined with different offset inside spaceTrim block', () => {
        expect(
            spaceTrim(
                (block) => `

                  Numbers
                    ${block(['1', '2', '3'].join('\n'))}
                  Chars
                       ${block(['A', 'B', 'C'].join('\n'))}


      `,
            ),
        ).toBe(
            [
                'Numbers',
                '  1',
                '  2',
                '  3',
                'Chars',
                '     A',
                '     B',
                '     C',
            ].join('\n'),
        );
    });

    it('will preserve aligment of nested blocks', () => {
        const nested = spaceTrim(`
        1
          2
            3
      `);

        expect(
            spaceTrim(
                (block) => `

                A:
                  ${block(nested)}
                B:
                    ${block(nested)}


    `,
            ),
        ).toBe(
            [
                'A:',
                '  1',
                '    2',
                '      3',
                'B:',
                '    1',
                '      2',
                '        3',
            ].join('\n'),
        );
    });
});

/**
 * TODO: Nesting with bullets (allow to prefix each line of block by any char(s))
 */
