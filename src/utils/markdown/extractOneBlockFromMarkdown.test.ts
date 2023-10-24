import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { extractOneBlockFromMarkdown } from './extractOneBlockFromMarkdown';

describe('how extractOneBlockFromMarkdown works', () => {
    it('should work with sample with one code block of one line', () => {
        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    \`\`\`python
                    print('Hello world')
                    \`\`\`
                `),
            ),
        ).toEqual({
            language: 'python',
            content: 'print(\'Hello world\')',
        });

        expect(
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    # Hello world

                    \`\`\`python
                    print('Hello world')
                    \`\`\`
                `),
            ),
        ).toEqual({
            language: 'python',
            content: 'print(\'Hello world\')',
        });
    });

    it('should fail with sample with no code blocks', () => {
        expect(() =>
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    Hello world
                `),
            ),
        ).toThrowError(/There should be exactly one code block in the markdown/i);

        expect(() =>
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    Hello world
                    Hello world
                `),
            ),
        ).toThrowError(/There should be exactly one code block in the markdown/i);

        expect(() =>
            extractOneBlockFromMarkdown(
                spaceTrim(`
                    # Hello world

                    Content with **bold** and *italic* text
                `),
            ),
        ).toThrowError(/There should be exactly one code block in the markdown/i);

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
        ).toThrowError(/There should be exactly one code block in the markdown/i);
    });

    it('should fail with sample with multiple code blocks of one line', () => {
        expect(() =>
            extractOneBlockFromMarkdown(
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
        ).toThrowError(/There should be exactly one code block in the markdown/i);
    });
});
