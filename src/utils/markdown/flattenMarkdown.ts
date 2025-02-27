import spaceTrim from "spacetrim";
import { DEFAULT_BOOK_TITLE } from "../../config";
import type { string_markdown } from "../../types/typeAliases";
import { parseMarkdownSection } from "./parseMarkdownSection";
import { splitMarkdownIntoSections } from "./splitMarkdownIntoSections";

/**
 * Normalizes the markdown by flattening the structure
 *
 * - It always have h1 - if there is no h1 in the markdown, it will be added `DEFAULT_BOOK_TITLE`
 * - All other headings are normalized to h2
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export function flattenMarkdown<TContent extends string_markdown>(
	markdown: TContent,
): TContent {
	const sections = splitMarkdownIntoSections(markdown);

	if (sections.length === 0) {
		return `# ${DEFAULT_BOOK_TITLE}` as TContent;
	}

	let flattenedMarkdown: string_markdown = "";

	const parsedSections = sections.map(parseMarkdownSection);
	const firstSection = parsedSections.shift()!;

	if (firstSection.level === 1) {
		flattenedMarkdown += `# ${firstSection.title}` + `\n\n`;
		flattenedMarkdown += firstSection.content + `\n\n`; // <- [🧠] Maybe 3 new lines?
	} else {
		parsedSections.unshift(firstSection);
		flattenedMarkdown += `# ${DEFAULT_BOOK_TITLE}` + `\n\n`; // <- [🧠] Maybe 3 new lines?
	}

	for (const { title, content } of parsedSections) {
		flattenedMarkdown += `## ${title}` + `\n\n`;
		flattenedMarkdown += content + `\n\n`; // <- [🧠] Maybe 3 new lines?
	}

	return spaceTrim(flattenedMarkdown) as TContent;
}

/**
 * TODO: [🏛] This can be part of markdown builder
 * Note: [🕞] In past (commit 42086e1603cbed506482997c00a8ee979af0a247) there was much more
 *       sophisticated implementation of this function through parsing markdown into JSON structure
 *       and flattening the actual structure
 *       NOW we are working just with markdown string and its good enough
 */
