import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { markdownToMarkdownStructure } from './markdownToMarkdownStructure';

describe('markdownToMarkdownStructure', () => {
    it('parses simple case', () => {
        expect(markdownToMarkdownStructure('# Title')).toEqual({
            level: 1,
            title: 'Title',
            content: '',
            sections: [],
        });
    });

    it('parses simple case with text', () => {
        expect(
            markdownToMarkdownStructure(
                spaceTrim(`
                    # Title

                    Text below title
                `),
            ),
        ).toEqual({
            level: 1,
            title: 'Title',
            content: 'Text below title',
            sections: [],
        });
    });

    it('parses simple case with multiline text', () => {
        expect(
            markdownToMarkdownStructure(
                spaceTrim(`
                    # Title

                    Text below title
                    Text below title
                    Text below title
                    Text below title
                `),
            ),
        ).toEqual({
            level: 1,
            title: 'Title',
            content: spaceTrim(`
                Text below title
                Text below title
                Text below title
                Text below title
            `),
            sections: [],
        });
    });

    it('parses simple case with bold/italic text', () => {
        expect(
            markdownToMarkdownStructure(
                spaceTrim(`
                    # Title

                    Text below title **bold** *italic*
                `),
            ),
        ).toEqual({
            level: 1,
            title: 'Title',
            content: 'Text below title **bold** *italic*',
            sections: [],
        });
    });

    it('parses simple case with ul/ol text', () => {
        expect(
            markdownToMarkdownStructure(
                spaceTrim(`
                    # Title

                    Text below title
                    - ul 1
                    - ul 2
                    - ul 3
                    1. ol 1
                    2. ol 2
                    3. ol 3
                `),
            ),
        ).toEqual({
            level: 1,
            title: 'Title',
            content: spaceTrim(`
                Text below title
                - ul 1
                - ul 2
                - ul 3
                1. ol 1
                2. ol 2
                3. ol 3
            `),
            sections: [],
        });
    });

    it('parses simple case with text and section', () => {
        expect(
            markdownToMarkdownStructure(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1
                `),
            ),
        ).toEqual({
            level: 1,
            title: 'Title',
            content: 'Text below title',
            sections: [
                {
                    level: 2,
                    title: 'Section 1',
                    content: 'Text below section 1',
                    sections: [],
                },
            ],
        });
    });

    it('ignores structure in code blocks', () => {
        expect(
            markdownToMarkdownStructure(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1

                    \`\`\`markdown

                    ### Title in code block

                    Text below title in code block

                    \`\`\`
                `),
            ),
        ).toEqual({
            level: 1,
            title: 'Title',
            content: 'Text below title',
            sections: [
                {
                    level: 2,
                    title: 'Section 1',
                    content: spaceTrim(`

                        Text below section 1

                        \`\`\`markdown

                        ### Title in code block

                        Text below title in code block

                        \`\`\`

                    `),
                    sections: [],
                },
            ],
        });
    });

    it('should fails when there is no structure', () => {
        expect(() => markdownToMarkdownStructure('')).toThrowError(
            /The markdown file must have exactly one top-level section/i,
        );
    });

    /*
    TODO: [🧠] Should theese cases fail or not?

    it('should fails when the first heading is not h1', () => {
        expect(() => markdownToMarkdownStructure(`## Section 1`)).toThrowError(/The file has an invalid structure/i);
    });

    it('should fails when there is heading level mismatch', () => {
        expect(() =>
            markdownToMarkdownStructure(
                spaceTrim(`
                    # Title

                    Text below title

                    ### Subsection 1.1

                    Text below subsection 1.1
                `),
            ),
        ).toThrowError(/The file has an invalid structure/i);
    });
    */

    it('parses advanced case', () => {
        expect(
            markdownToMarkdownStructure(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1

                    ## Section 2

                    Text below section 2

                    ### Subsection 2.1

                    Text below subsection 2.1

                    ### Subsection 2.2

                    Text below subsection 2.2
                `),
            ),
        ).toEqual({
            level: 1,
            title: 'Title',
            content: 'Text below title',
            sections: [
                {
                    level: 2,
                    title: 'Section 1',
                    content: 'Text below section 1',
                    sections: [],
                },
                {
                    level: 2,
                    title: 'Section 2',
                    content: 'Text below section 2',
                    sections: [
                        {
                            level: 3,
                            title: 'Subsection 2.1',
                            content: 'Text below subsection 2.1',
                            sections: [],
                        },
                        {
                            level: 3,
                            title: 'Subsection 2.2',
                            content: 'Text below subsection 2.2',
                            sections: [],
                        },
                    ],
                },
            ],
        });
    });
});
