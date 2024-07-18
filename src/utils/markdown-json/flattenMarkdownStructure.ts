import { MarkdownStructure } from './MarkdownStructure';

/**
 * Keeps all h1 and h2 headings and from deeper levels change them to h2 headings
 * Preserves the order of sections
 */
export function flattenMarkdownStructure(markdownStructure: MarkdownStructure): MarkdownStructure {
    const { sections, ...rest } = markdownStructure;

    const newSections: MarkdownStructure[] = [];
    const traverse = (...sections: Array<MarkdownStructure>) => {
        for (const section of sections) {
            newSections.push({ ...section, level: 2, sections: [] });
            traverse(...section.sections);
        }
    };

    traverse(...sections);

    return {
        ...rest,
        sections: newSections,
    };
}

/**
 * TODO: Make more universal, not only for h1 and h2 headings
 */
