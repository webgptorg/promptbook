import spaceTrim from 'spacetrim';
import type {
    string_markdown_section,
    string_markdown_section_content,
    string_markdown_text,
} from '../../types/typeAliases';

/**
 * Parsed markdown section
 */
export type MarkdownSection = {
    /**
     * Title of the section
     */
    title: string_markdown_text;

    /**
     * Level of the section like h1, h2, h3, h4, h5, h6
     */
    level: 1 | 2 | 3 | 4 | 5 | 6;

    /**
     * Content of the section with markdown formatting, blocks, lists, etc.
     */
    content: string_markdown_section_content;
};

/**
 * Parses markdown section to title its level and content
 */
export function parseMarkdownSection(value: string_markdown_section): MarkdownSection {
    const lines = value.split('\n');

    if (!lines[0]!.startsWith('#')) {
        throw new Error('Markdown section must start with heading');
    }

    const title = lines[0]!.replace(/^#+\s*/, '');
    const level = lines[0]!.match(/^#+/)?.[0].length ?? 0;
    const content = spaceTrim(lines.slice(1).join('\n'));

    if (level < 1 || level > 6) {
        throw new Error('Markdown section must have heading level between 1 and 6');
    }

    return { title, level: level as 1 | 2 | 3 | 4 | 5 | 6, content };
}

/**
 * Note: [🕞] In past (commit 42086e1603cbed506482997c00a8ee979af0a247) there was much more
 *       sophisticated implementation of this function through parsing markdown into JSON structure
 *       and flattening the actual structure
 *       NOW we are working just with markdown string and its good enough
 */
