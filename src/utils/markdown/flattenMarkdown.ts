import { string_markdown } from '../../types/typeAliases';

/**
 * !!!
 *
 * Note: This function does work with code blocks
 * Note: !!! This function does not work with markdown comments
 *
 * @param markdown The markdown string to parse.
 * @returns The MarkdownStructure object.
 */
export function flattenMarkdown(markdown: string_markdown): string_markdown {
    // const lines = markdown.split('\n');
    // TODO: USE and implement splitMarkdownByHeadings
    return markdown;
}

/**
 * Note: [🕞] In past (commit 42086e1603cbed506482997c00a8ee979af0a247) there was much more
 *       sophisticated implementation of this function through parsing markdown into JSON structure
 *       and flattening the actual structure
 *       NOW we are working just with markdown string and its good enough
 */
