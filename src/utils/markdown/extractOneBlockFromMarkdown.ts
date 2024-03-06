import { string_markdown } from '../.././types/typeAliases';
import { extractAllBlocksFromMarkdown } from './extractAllBlocksFromMarkdown';

/**
 * Extracts exactly ONE code block from markdown.
 *
 * Note: This function is similar to extractAllBlocksFromMarkdown but it validates that there is exactly one code block.
 * Note: If there are multiple or no code blocks the function throws an error
 *
 * @param markdown any valid markdown
 * @returns code block with language and content
 */
export function extractOneBlockFromMarkdown(markdown: string_markdown): { language: string | null; content: string } {
    const codeBlocks = extractAllBlocksFromMarkdown(markdown);


    if (codeBlocks.length !== 1) {
        // TODO: Report more specific place where the error happened
        throw new Error('There should be exactly one code block in the markdown');
    }

    return codeBlocks[0]!;
}
