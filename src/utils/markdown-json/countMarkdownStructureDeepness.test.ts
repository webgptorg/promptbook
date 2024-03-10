import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { countMarkdownStructureDeepness } from './countMarkdownStructureDeepness';

describe('countMarkdownStructureDeepness', () => {
    it('counts simple case', () => {
        expect(
            countMarkdownStructureDeepness({
                level: 1,
                title: 'Title',
                content: '',
                sections: [],
            }),
        ).toEqual(1);
    });

    it('counts simple case with text', () => {
        expect(
            countMarkdownStructureDeepness({
                level: 1,
                title: 'Title',
                content: 'Text below title',
                sections: [],
            }),
        ).toEqual(1);
    });

    it('counts simple case with multi-line text', () => {
        expect(
            countMarkdownStructureDeepness({
                level: 1,
                title: 'Title',
                content: spaceTrim(`
                        Text below title
                        Text below title
                        Text below title
                        Text below title
                    `),
                sections: [],
            }),
        ).toEqual(1);
    });

    it('counts simple case with bold/italic text', () => {
        expect(
            countMarkdownStructureDeepness({
                level: 1,
                title: 'Title',
                content: 'Text below title **bold** *italic*',
                sections: [],
            }),
        ).toEqual(1);
    });

    it('counts simple case with ul/ol text', () => {
        expect(
            countMarkdownStructureDeepness({
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
            }),
        ).toEqual(1);
    });

    it('counts simple case with text and section', () => {
        expect(
            countMarkdownStructureDeepness({
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
            }),
        ).toEqual(2);
    });

    it('ignores structure in code blocks', () => {
        expect(
            countMarkdownStructureDeepness({
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
            }),
        ).toEqual(2);
    });

    it('counts advanced case', () => {
        expect(
            countMarkdownStructureDeepness({
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
            }),
        ).toEqual(3);
    });
});
