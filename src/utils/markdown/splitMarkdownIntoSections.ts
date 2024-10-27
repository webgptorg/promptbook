import spaceTrim from 'spacetrim';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_section } from '../../types/typeAliases';

/**
 * Splits the markdown into sections by headings
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function splitMarkdownIntoSections(markdown: string_markdown): ReadonlyArray<string_markdown_section> {
    const lines = markdown.split('\n');
    const sections: Array<string_markdown> = [];

    let currentType: 'MARKDOWN' | 'CODE_BLOCK' | 'COMMENT' = 'MARKDOWN';
    let buffer: Array<string_markdown> = [];

    const finishSection = () => {
        if (buffer.length === 0) {
            return;
        }

        let section = spaceTrim(buffer.join('\n'));

        if (section === '') {
            return;
        }

        if (!section.startsWith('#')) {
            section = `# Untitled\n\n${section}`;
        }

        sections.push(section);
        buffer = [];
    };

    for (const line of lines) {
        if (currentType === 'MARKDOWN') {
            if (line.startsWith('#')) {
                finishSection();
            }

            buffer.push(line);

            if (line.startsWith('```')) {
                currentType = 'CODE_BLOCK';
            } else if (line.includes('<!--')) {
                currentType = 'COMMENT';
            }
        } else if (currentType === 'CODE_BLOCK') {
            buffer.push(line);
            if (line.startsWith('```')) {
                currentType = 'MARKDOWN';
            }
        } else if (currentType === 'COMMENT') {
            buffer.push(line);
            if (line.includes('-->')) {
                currentType = 'MARKDOWN';
            }
        }
    }

    finishSection();
    return sections;
}

/**
 * TODO: [🏛] This can be part of markdown builder
 * Note: [🕞] In past (commit 42086e1603cbed506482997c00a8ee979af0a247) there was much more
 *       sophisticated implementation of this function through parsing markdown into JSON structure
 *       and flattening the actual structure
 *       NOW we are working just with markdown string and its good enough
 */
