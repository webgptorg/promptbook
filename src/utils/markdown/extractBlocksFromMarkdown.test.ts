import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { extractBlocksFromMarkdown } from './extractBlocksFromMarkdown';

describe('how extractBlocksFromMarkdown works', () => {
    it('should work with sample with no code blocks', () => {
        expect(
            extractBlocksFromMarkdown(
                spaceTrim(`
                    Hello world
                `),
            ),
        ).toEqual([]);

        expect(
            extractBlocksFromMarkdown(
                spaceTrim(`
                    Hello world
                    Hello world
                `),
            ),
        ).toEqual([]);

        expect(
            extractBlocksFromMarkdown(
                spaceTrim(`
                    # Hello world

                    Content with **bold** and *italic* text
                `),
            ),
        ).toEqual([]);

        expect(
            extractBlocksFromMarkdown(
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
            extractBlocksFromMarkdown(
                spaceTrim(`
                    \`\`\`python
                    print('Hello world')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: "print('Hello world')",
            },
        ]);

        expect(
            extractBlocksFromMarkdown(
                spaceTrim(`
                    # Hello world

                    \`\`\`python
                    print('Hello world')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: "print('Hello world')",
            },
        ]);
    });

    it('should work with code block without language', () => {
        expect(
            extractBlocksFromMarkdown(
                spaceTrim(`
                    \`\`\`
                    print('Hello world')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: null,
                content: "print('Hello world')",
            },
        ]);

        expect(
            extractBlocksFromMarkdown(
                spaceTrim(`
                    # Hello world

                    \`\`\`python
                    print('Hello world')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: "print('Hello world')",
            },
        ]);
    });

    it('should work with sample with one code block of multiple lines', () => {
        expect(
            extractBlocksFromMarkdown(
                spaceTrim(`

                    # Sample

                    Sample python code:

                    \`\`\`python
                    print('Hello world')
                    print('Hello world')
                    print('Hello world')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: spaceTrim(`
        
                    print('Hello world')
                    print('Hello world')
                    print('Hello world')
            
                `),
            },
        ]);
    });

    it('should work with sample with multiple code blocks of one line', () => {
        expect(
            extractBlocksFromMarkdown(
                spaceTrim(`
                    # Hello world

                    Hello world in multiple languages:

                    ## Python

                    Hello world in Python:

                    \`\`\`python
                    print('Hello world')
                    \`\`\`

                    ## Javascript

                    Hello world in Javascript:

                    \`\`\`javascript
                    console.log('Hello world')
                    \`\`\`
                `),
            ),
        ).toEqual([
            {
                language: 'python',
                content: "print('Hello world')",
            },
            {
                language: 'javascript',
                content: "console.log('Hello world')",
            },
        ]);
    });

    it('should not be confused by 3 backtics in codeblock which are not ending the codeblock', () => {
        expect(
            extractBlocksFromMarkdown(
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
                content: `console.log('Hello 3 backtics \`\`\`')`,
            },
        ]);
    });
});
