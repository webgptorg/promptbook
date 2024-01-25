import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { extractAllBlocksFromMarkdown } from './extractAllBlocksFromMarkdown';

describe('how extractAllBlocksFromMarkdown works', () => {
    it('should work with sample with no code blocks', () => {
        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`
                    Hello World
                `),
            ),
        ).toEqual([]);

        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`
                    Hello World
                    Hello World
                `),
            ),
        ).toEqual([]);

        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`
                    # Hello World

                    Content with **bold** and *italic* text
                `),
            ),
        ).toEqual([]);

        expect(
            extractAllBlocksFromMarkdown(
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
        ).toEqual([]);
    });

    it('should work with sample with one code block of one line', () => {
        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`
                    \`\`\`python
                    print('Hello World')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: "print('Hello World')",
            },
        ]);

        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`
                    # Hello World

                    \`\`\`python
                    print('Hello World')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: "print('Hello World')",
            },
        ]);
    });

    it('should work with code block without language', () => {
        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`
                    \`\`\`
                    print('Hello World')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: null,
                content: "print('Hello World')",
            },
        ]);

        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`
                    # Hello World

                    \`\`\`python
                    print('Hello World')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: "print('Hello World')",
            },
        ]);
    });

    it('should work with sample with one code block of multiple lines', () => {
        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`

                    # Sample

                    Sample python code:

                    \`\`\`python
                    print('Hello World')
                    print('Hello World')
                    print('Hello World')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: spaceTrim(`

                    print('Hello World')
                    print('Hello World')
                    print('Hello World')

                `),
            },
        ]);
    });

    it('should work with python+javascript+unknown code blocks', () => {
        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`

                    # Python

                    \`\`\`python
                    print('Hello World')
                    print('Hello Mars')
                    \`\`\`

                    # Javascript

                    \`\`\`javascript
                    console.log('Hello World')
                    console.log('Hello Mars')
                    \`\`\`

                    # Unknown

                    \`\`\`
                    $5/-/++'=>Hello World
                    $5/-/++'=>Hello Mars
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: spaceTrim(`
                    print('Hello World')
                    print('Hello Mars')
                `),
            },
            {
                language: 'javascript',
                content: spaceTrim(`
                    console.log('Hello World')
                    console.log('Hello Mars')
                `),
            },
            {
                language: null,
                content: spaceTrim(`
                    $5/-/++'=>Hello World
                    $5/-/++'=>Hello Mars
                `),
            },
        ]);
    });

    it('should work with sample with multiple code blocks of one line', () => {
        expect(
            extractAllBlocksFromMarkdown(
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
                    console.log('Hello World')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: "print('Hello World')",
            },
            {
                language: 'javascript',
                content: "console.log('Hello World')",
            },
        ]);
    });

    it('should not be confused by 3 backtics in codeblock which are not ending the codeblock', () => {
        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`

                    ## Javascript

                    \`\`\`javascript
                    console.log('Hello 3 backtics \`\`\`')
                    \`\`\`


                `),
            ),
        ).toEqual([
            {
                language: 'javascript',
                content: "console.log('Hello 3 backtics ```')",
            },
        ]);
    });

    it('should work with codeblock with escaped embeded codeblock as content', () => {
        expect(
            extractAllBlocksFromMarkdown(
                spaceTrim(`

                  This is a simple markdown with code block with escaped embeded code block as content:

                  \`\`\`markdown

                  Markdown has simple formatting like **bold** and *italic* text.

                  Also it has code blocks:
                  \\\`\\\`\\\`python
                  print('Hello World')
                  \\\`\\\`\\\`

                  \\\`\\\`\\\`javascript
                  console.log('Hello World')
                  \\\`\\\`\\\`

                  And loooot of other features.

                  \`\`\`

                  And another code block:

                  \`\`\`python
                  print('Hello World')
                  \`\`\`
              `),
            ),
        ).toEqual([
            {
                language: 'markdown',
                content:
                    spaceTrim(`

                      Markdown has simple formatting like **bold** and *italic* text.

                      Also it has code blocks:
                      \`\`\`python
                      print('Hello World')
                      \`\`\`

                      \`\`\`javascript
                      console.log('Hello World')
                      \`\`\`

                      And loooot of other features.

                    `) + '\n',
            },
            {
                language: 'python',
                content: "print('Hello World')",
            },
        ]);
    });

    it('should throw error when code block is not propperly closed', () => {
        expect(() =>
            extractAllBlocksFromMarkdown(
                spaceTrim(`

                    This is a simple markdown code:

                    \`\`\`markdown
                    Hello World
                    \`\`\`

                    This is a simple python code:

                    \`\`\`python
                    print('Hello World')
                `),
            ),
        ).toThrowError(/Python code block was not closed at the end of the markdown/i);

        expect(() =>
            extractAllBlocksFromMarkdown(
                spaceTrim(`

                    This is a simple markdown code:

                    \`\`\`markdown
                    Hello World

                    This is a simple python code:

                    \`\`\`python
                    print('Hello World')
                    \`\`\`
                `),
            ),
        ).toThrowError(/Markdown code block was not closed and already opening new python code block/i);

        expect(() =>
            extractAllBlocksFromMarkdown(
                spaceTrim(`

                    This is a simple markdown code:

                    \`\`\`markdown
                    Hello World
                    \`\`\`markdown

                    This is a simple python code:

                    \`\`\`python
                    print('Hello World')
                    \`\`\`python
                `),
            ),
        ).toThrowError(/Markdown code block was not closed and already opening new markdown code block/i);
    });
});
