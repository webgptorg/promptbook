import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { removeComments } from './removeComments';

describe('removeComments', () => {
    it('should remove comments from simple text', () => {
        expect(
            removeComments(
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

    it('should remove comments from markdown', () => {
        expect(
            removeComments(
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
            removeComments(
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
            removeComments(
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
            removeComments(
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

    it('should remove multi-line comments from simple text', () => {
        expect(
            removeComments(
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

    it('should not remove confusing non-comments', () => {
        expect(
            removeComments(
                spaceTrim(`
                    This is < not a comment >
                    Here is some code: \`<!-- This is not a comment, but code -->\`
                    And a code block:
                    \`\`\`html
                    <!-- This is HTML code, not a comment to be removed -->
                    <div>Some content</div>
                    \`\`\`
                `),
            ),
        ).toBe(
            spaceTrim(`
                    This is < not a comment >
                    Here is some code: \`<!-- This is not a comment, but code -->\`
                    And a code block:
                    \`\`\`html
                    <!-- This is HTML code, not a comment to be removed -->
                    <div>Some content</div>
                    \`\`\`
            `),
        );
    });
});
