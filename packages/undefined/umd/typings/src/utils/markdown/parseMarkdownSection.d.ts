import type { string_markdown_section } from '../../types/typeAliases';
import type { string_markdown_section_content } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
/**
 * Parsed markdown section
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export type MarkdownSection = {
    /**
     * Title of the section
     */
    readonly title: string_markdown_text;
    /**
     * Level of the section like h1, h2, h3, h4, h5, h6
     */
    readonly level: 1 | 2 | 3 | 4 | 5 | 6;
    /**
     * Content of the section with markdown formatting, blocks, lists, etc.
     */
    readonly content: string_markdown_section_content;
};
/**
 * Parses markdown section to title its level and content
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export declare function parseMarkdownSection(value: string_markdown_section): MarkdownSection;
/**
 * Note: [🕞] In past (commit 42086e1603cbed506482997c00a8ee979af0a247) there was much more
 *       sophisticated implementation of this function through parsing markdown into JSON structure
 *       and flattening the actual structure
 *       NOW we are working just with markdown string and its good enough
 */
