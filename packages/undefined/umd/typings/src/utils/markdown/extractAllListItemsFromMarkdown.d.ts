import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
/**
 * Utility function to extract all list items from markdown
 *
 * Note: It works with both ul and ol
 * Note: It omits list items in code blocks
 * Note: It flattens nested lists
 * Note: It can not work with html syntax and comments
 *
 * @param markdown any valid markdown
 * @returns @@@
 * @public exported from `@promptbook/markdown-utils`
 */
export declare function extractAllListItemsFromMarkdown(markdown: string_markdown): string_markdown_text[];
