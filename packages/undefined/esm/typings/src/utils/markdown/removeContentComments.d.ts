import type { string_html } from '../../types/typeAliases';
import type { string_markdown } from '../../types/typeAliases';
/**
 * Removes HTML or Markdown comments from a string.
 *
 * @param {string} content - The string to remove comments from.
 * @returns {string} The input string with all comments removed.
 * @public exported from `@promptbook/markdown-utils`
 */
export declare function removeContentComments<TContent extends string_html | string_markdown>(content: TContent): TContent;
