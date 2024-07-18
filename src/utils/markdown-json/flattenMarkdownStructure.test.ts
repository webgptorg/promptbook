import { describe, expect, it } from '@jest/globals';
import { just } from '../just';
import { flattenMarkdownStructure } from './flattenMarkdownStructure';

describe('how flattenMarkdownStructure works', () => {
    it('keeps flattened markdown', () =>
        expect(
            flattenMarkdownStructure({
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
        ).toEqual(
            just({
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
        ));

    it('flattens the simple markdown', () =>
        expect(
            flattenMarkdownStructure({
                level: 1,
                title: 'Title',
                content: 'Text below title',
                sections: [
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
                        ],
                    },
                ],
            }),
        ).toEqual(
            just({
                level: 1,
                title: 'Title',
                content: 'Text below title',
                sections: [
                    {
                        level: 2,
                        title: 'Section 2',
                        content: 'Text below section 2',
                        sections: [],
                    },
                    {
                        level: 2,
                        title: 'Subsection 2.1',
                        content: 'Text below subsection 2.1',
                        sections: [],
                    },
                ],
            }),
        ));

    it('flattens the 3 level markdown', () =>
        expect(
            flattenMarkdownStructure({
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
                    {
                        level: 2,
                        title: 'Section 3',
                        content: 'Text below section 3',
                        sections: [],
                    },
                ],
            }),
        ).toEqual(
            just({
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
                        sections: [],
                    },
                    {
                        level: 2,
                        title: 'Subsection 2.1',
                        content: 'Text below subsection 2.1',
                        sections: [],
                    },
                    {
                        level: 2,
                        title: 'Subsection 2.2',
                        content: 'Text below subsection 2.2',
                        sections: [],
                    },
                    {
                        level: 2,
                        title: 'Section 3',
                        content: 'Text below section 3',
                        sections: [],
                    },
                ],
            }),
        ));

    /*
    TODO:
    it('flattens the advanced markdown', () =>
    );
    */
});
