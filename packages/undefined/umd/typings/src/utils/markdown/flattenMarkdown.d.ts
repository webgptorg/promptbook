import type { string_markdown } from '../../types/typeAliases';
/**
 * Normalizes the markdown by flattening the structure
 *
 * - It always have h1 - if there is no h1 in the markdown, it will be added "# Untitled"
 * - All other headings are normalized to h2
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export declare function flattenMarkdown<TContent extends string_markdown>(markdown: TContent): TContent;
/**
 * TODO: [🏛] This can be part of markdown builder
 * Note: [🕞] In past (commit 42086e1603cbed506482997c00a8ee979af0a247) there was much more
 *       sophisticated implementation of this function through parsing markdown into JSON structure
 *       and flattening the actual structure
 *       NOW we are working just with markdown string and its good enough
 */
