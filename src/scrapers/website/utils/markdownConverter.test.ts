import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { markdownConverter } from './markdownConverter';

describe(`markdownConverter`, () => {
    it(`preserves supersimple markdown to html`, () => {
        expect(markdownConverter.makeHtml('hello')).toEqual('<p>hello</p>');
    });

    it(`preserves supersimple html to markdown`, () => {
        expect(spaceTrim(markdownConverter.makeMarkdown('<p>hello</p>'))).toEqual('hello');
    });

    it(`converts simple markdown to html`, () => {
        expect(
            spaceTrim(
                markdownConverter.makeHtml(
                    spaceTrim(`
                
                    # Hello World!

                    This is a **markdown** text.
                
                `),
                ),
            ),
        ).toEqual(
            spaceTrim(`

                    <h1 id="helloworld">Hello World!</h1>
                    <p>This is a <strong>markdown</strong> text.</p>

            `),
        );
    });

    it(`converts simple html to markdown`, () => {
        expect(
            spaceTrim(
                markdownConverter.makeMarkdown(
                    spaceTrim(`

                    <h1>Hello World!</h1>
                    <p>This is a <strong>markdown</strong> text.</p>

                `),
                ),
            ),
        ).toEqual(
            spaceTrim(`
                
                    # Hello World!

                    This is a **markdown** text.
            
            `),
        );
    });

    /*/
    Note: [🧠][🎐] Code can not be converted back from html to markdown

    it(`preserves advanced markdown when converted to html and back `, () => {
        const markdown = spaceTrim(`
                
            # Hello World!

            This is a **markdown** text.

            ---

            This is a [link](https://collboard.com).

            This is a list:
            - item 1
            - item 2
            - item 3

            ---

            This is a table:

            | Header 1 | Header 2 |
            | -------- | -------- |
            | Cell 1   | Cell 2   |
            | Cell 3   | Cell 4   |

            ---

            This is a code:

            \`\`\`js
            const a = 1;
            const b = 2;
            const c = a + b;
            \`\`\`

        
        `);

        expect(markdownConverter.makeMarkdown(markdownConverter.makeHtml(markdown))).toEqual(markdown);
    });

    /**/
});
