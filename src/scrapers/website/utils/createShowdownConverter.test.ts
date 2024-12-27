import { describe, expect, it } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { spaceTrim } from 'spacetrim';
import { createShowdownConverter } from './createShowdownConverter';

describe(`markdownConverter`, () => {
    const showdownConverter = createShowdownConverter();
    const jsdom = new JSDOM();

    it(`preserves supersimple markdown to html`, () => {
        expect(showdownConverter.makeHtml('hello')).toEqual('<p>hello</p>');
    });

    it(`preserves supersimple html to markdown`, () => {
        expect(spaceTrim(showdownConverter.makeMarkdown('<p>hello</p>', jsdom.window.document))).toEqual('hello');
    });

    it(`converts simple markdown to html`, () => {
        expect(
            spaceTrim(
                showdownConverter.makeHtml(
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
                showdownConverter.makeMarkdown(
                    spaceTrim(`

                    <h1>Hello World!</h1>
                    <p>This is a <strong>markdown</strong> text.</p>

                `),
                    jsdom.window.document,
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

        expect(markdownConverter.makeMarkdown(markdownConverter.makeHtml(markdown), jsdom.window.document)).toEqual(markdown);
    });

    /**/
});
