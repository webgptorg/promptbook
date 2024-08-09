import type { string_markdown, string_markdown_section } from '../../types/typeAliases';
/**
 * Splits the markdown into sections by headings
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export declare function splitMarkdownIntoSections(markdown: string_markdown): Array<string_markdown_section>;
/**
 * TODO: [🏛] This can be part of markdown builder
 * Note: [🕞] In past (commit 42086e1603cbed506482997c00a8ee979af0a247) there was much more
 *       sophisticated implementation of this function through parsing markdown into JSON structure
 *       and flattening the actual structure
 *       NOW we are working just with markdown string and its good enough
 */
