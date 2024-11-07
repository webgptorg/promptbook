import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { extractOneBlockFromMarkdown } from './extractOneBlockFromMarkdown';

describe('how extractOneBlockFromMarkdown works', () => {
    it('should work with example with one unknown code block of one line', () => {
        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    # Hello World

                    \`\`\`
                    print('Hello World')
                    \`\`\`
                `),
            ),
        ).toEqual({
            blockNotation: '```',
            language: null,
            content: "print('Hello World')",
        });
    });

    it('should work with example with one code block made by gt char', () => {
        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`
                  # Hello World

                  > print('Hello World')

              `),
            ),
        ).toEqual({
            blockNotation: '>',
            language: null,
            content: "print('Hello World')",
        });
    });

    it('should work with example with one multiline code block made by gt char', () => {
        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`
                # Hello World

                > print('Hello World 1')
                > print('Hello World 2')
                > print('Hello World 3')

            `),
            ),
        ).toEqual({
            blockNotation: '>',
            language: null,
            content: spaceTrim(`
                print('Hello World 1')
                print('Hello World 2')
                print('Hello World 3')
           `),
        });
    });

    it('should work with example with block nested in block with mixed notations', () => {
        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    # A

                    B

                    > C
                    > D
                    > \`\`\`E
                    > F
                    > \`\`\`
                    > G

                    H

                `),
            ),
        ).toEqual({
            blockNotation: '>',
            language: null,
            content: spaceTrim(`
                C
                D
                \`\`\`E
                F
                \`\`\`
                G
            `),
        });
        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    # A

                    B

                    \`\`\`C
                    D
                    > E
                    > F
                    G
                    \`\`\`

                    H

                `),
            ),
        ).toEqual({
            blockNotation: '```',
            language: 'C',
            content: spaceTrim(`
              D
              > E
              > F
              G
            `),
        });
    });

    it('should work with example with one python code block of one line', () => {
        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    \`\`\`python
                    print('Hello World')
                    \`\`\`
                `),
            ),
        ).toEqual({
            blockNotation: '```',
            language: 'python',
            content: "print('Hello World')",
        });

        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    # Hello World

                    \`\`\`python
                    print('Hello World')
                    \`\`\`
                `),
            ),
        ).toEqual({
            blockNotation: '```',
            language: 'python',
            content: "print('Hello World')",
        });
    });

    it('should work with codeblock with escaped embeded codeblock as content', () => {
        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`

                  This is a simple markdown with code block with escaped embeded code block as content:

                  \`\`\`markdown

                  Markdown has simple formatting like **bold** and *italic* text.

                  Also it has code blocks:
                  \\\`\\\`\\\`python
                  print('Hello World')
                  \\\`\\\`\\\`

                  And loooot of other features.

                  \`\`\`
              `),
            ),
        ).toEqual({
            blockNotation: '```',
            language: 'markdown',
            content:
                spaceTrim(`

                  Markdown has simple formatting like **bold** and *italic* text.

                  Also it has code blocks:
                  \`\`\`python
                  print('Hello World')
                  \`\`\`

                  And loooot of other features.

                `) + '\n',
        });
    });

    it('should fail with example with no code blocks', () => {
        expect(() =>
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    Hello World
                `),
            ),
        ).toThrowError(/There should be exactly 1 code block in template, found 0 code blocks/i);

        expect(() =>
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    Hello World
                    Hello World
                `),
            ),
        ).toThrowError(/There should be exactly 1 code block in template, found 0 code blocks/i);

        expect(() =>
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    # Hello World

                    Content with **bold** and *italic* text
                `),
            ),
        ).toThrowError(/There should be exactly 1 code block in template, found 0 code blocks/i);

        expect(() =>
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    # Prague

                    Prague is the capital of Czech Republic. It is a beautiful city. In my opinion, it is the most beautiful city in the world.

                    If you are in Prague, you should visit the following places:

                    - Prague Castle
                    - Charles Bridge
                    - Old Town Square

                    ## Prague Castle

                    \`Prague Castle\` is the largest ancient castle in the world. It is located in the center of Prague.

                    ## Lennon Wall

                    \`Lennon Wall\` is a wall in Prague. It is located in the center of Prague. On this wall, you can see many graffiti like %#2/*\`\`\`7#^
                `),
            ),
        ).toThrowError(/There should be exactly 1 code block in template, found 0 code blocks/i);
    });

    it('should fail with example with multiple code blocks of one line', () => {
        expect(() =>
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    # Hello World

                    Hello World in multiple languages:

                    ## Python

                    Hello World in Python:

                    \`\`\`python
                    print('Hello World')
                    \`\`\`

                    ## Javascript

                    Hello World in Javascript:

                    \`\`\`javascript
                    console.info('Hello World')
                    \`\`\`
                `),
            ),
        ).toThrowError(/There should be exactly 1 code block in template, found 2 code blocks/i);
    });
});
