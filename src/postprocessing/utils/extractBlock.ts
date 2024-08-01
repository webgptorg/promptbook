import type { string_markdown } from '../../types/typeAliases';
import { extractOneBlockFromMarkdown } from '../../utils/markdown/extractOneBlockFromMarkdown';

/**
 * Extracts code block from markdown.
 *
 * Note: If there are multiple or no code blocks the function throws an error
 *
 * Note: There are 3 simmilar function:
 * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
 * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
 * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
 */
export function extractBlock(markdown: string_markdown): string {
    const { content } = extractOneBlockFromMarkdown(markdown);

    return content;
}
//
