import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { removeComtentComments } from './removeComtentComments';

describe('removeComtentComments', () => {
    it('should remove comments from simple text', () => {
        expect(
            removeComtentComments(
                spaceTrim(`
                    <!-- This is an comment -->
                    Hello World
                `),
            ),
        ).toBe(
            spaceTrim(`
                    Hello World
            `),
        );
    });

    it('should remove comments from html', () => {
        expect(
            removeComtentComments(
                spaceTrim(`
                    <!-- This is an HTML comment -->
                    <h1>Hello World</h1>
                    <p>Some content</p>
                `),
            ),
        ).toBe(
            spaceTrim(`
                    <h1>Hello World</h1>
                    <p>Some content</p>
            `),
        );
        expect(
            removeComtentComments(
                spaceTrim(`
                    <h1>Hello World</h1>
                    <!-- This is an HTML comment -->
                    <p>Some content</p>
                `),
            ),
        ).toBe(
            spaceTrim(`
                    <h1>Hello World</h1>

                    <p>Some content</p>
            `),
        );
    });

    it('should remove comments from markdown', () => {
        expect(
            removeComtentComments(
                spaceTrim(`
                    <!-- This is an markdown comment -->
                    # Hello World

                    Some content
                `),
            ),
        ).toBe(
            spaceTrim(`
                    # Hello World

                    Some content
            `),
        );
        expect(
            removeComtentComments(
                spaceTrim(`

                    # Hello World
                    <!-- This is an markdown comment -->
                    Some content
                `),
            ),
        ).toBe(
            spaceTrim(`
                    # Hello World

                    Some content
            `),
        );
    });

    it('should not be confisused with comment content', () => {
        expect(
            removeComtentComments(
                spaceTrim(`
                    <!-- This <!--is an HTML -> comment -->
                    Hello World
                `),
            ),
        ).toBe(
            spaceTrim(`
                    Hello World
            `),
        );
    });

    it('should remove multiple comments from simple text', () => {
        expect(
            removeComtentComments(
                spaceTrim(`
                    <!-- This is an comment -->
                    Hello <!-- Flat -->World
                    <!-- This is also an comment -->
                    <!-- And also this -->
                `),
            ),
        ).toBe(
            spaceTrim(`
                    Hello World
            `),
        );
    });

    it('should remove multiline comments from simple text', () => {
        expect(
            removeComtentComments(
                spaceTrim(`
                    <!--
                    This is an comment
                    Using multiple
                    lines


                    wohoo
                    -->
                    Hello <!--

                    Flat
                    or
                    Round

                    -->World
                `),
            ),
        ).toBe(
            spaceTrim(`
                    Hello World
            `),
        );
    });

    /*
    TODO:
    it('should not remove confusing non-comments', () => {
    });
    */
});
