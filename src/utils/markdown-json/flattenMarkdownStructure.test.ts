import { describe, expect, it } from '@jest/globals';
import { just } from '../just';
import { MarkdownStructure } from './MarkdownStructure';

describe('how flattenMarkdownStructure works', () => {
    it('should work with foo', () =>
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
});

/**
 * Keeps all h1 and h2 headings and from deeper levels change them to h2 headings
 * Preserves the order of sections
 */
export function flattenMarkdownStructure(markdownStructure: MarkdownStructure): MarkdownStructure {
    const { sections, ...rest } = markdownStructure;

    const newSections: MarkdownStructure[] = [];
    for (const section of sections) {
        if (section.level <= 2) {
            newSections.push(section);
        } else {
            newSections.push({
                ...section,
                level: 2,
            });
        }

        newSections.push(...flattenMarkdownStructure(section).sections);
    }

    return {
        ...rest,
        sections: newSections,
    };
}
