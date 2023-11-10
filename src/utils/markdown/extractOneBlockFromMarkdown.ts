import { string_markdown } from '../.././types/typeAliases';
import { extractBlocksFromMarkdown } from './extractBlocksFromMarkdown';

/**
 * Extracts exactly ONE code block from markdown.
 *
 * Note: This function is similar to extractBlocksFromMarkdown but it validates that there is exactly one code block.
 * Note: If there are multiple or no code blocks the function throws an error
 *
 * @param markdown any valid markdown
 * @returns code block with language and content
 *
 * @private within the library
 */
export function extractOneBlockFromMarkdown(markdown: string_markdown): { language: string | null; content: string } {
    const codeBlocks = extractBlocksFromMarkdown(markdown);

    if (codeBlocks.length !== 1) {
        // TODO: Report more specific place where the error happened
        throw new Error('There should be exactly one code block in the markdown');
    }

    return codeBlocks[0]!;
}
