import { spaceTrim } from "spacetrim";
import type { string_html } from "../../types/typeAliases";
import type { string_markdown } from "../../types/typeAliases";
/**
 * Removes Markdown (or HTML) comments
 *
 * @param {string} content - The string to remove comments from.
 * @returns {string} The input string with all comments removed.
 * @public exported from `@promptbook/markdown-utils`
 */
export function removeMarkdownComments<
	TContent extends string_html | string_markdown,
>(content: TContent): TContent {
	return spaceTrim(content.replace(/<!--(.*?)-->/gs, "")) as TContent;
}
