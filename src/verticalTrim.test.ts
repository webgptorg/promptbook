import { verticalTrim } from './verticalTrim';

// tslint:disable:no-trailing-whitespace
describe('how vertical trim works', () => {
    it('will vertically trim', () => {
        expect(
            verticalTrim(`

                Hello
                Vertical
                Trim${'   '}


        `),
        ).toBe(
            [
                '                Hello',
                '                Vertical',
                '                Trim   ',
            ].join('\n'),
        );
    });

    it('will space vertically with 2 zig-zag lines', () => {
        expect(
            verticalTrim(`
            Hello
        Vertical${'            '}
    `),
        ).toBe(
            ['            Hello', '        Vertical            '].join('\n'),
        );
    });
});
