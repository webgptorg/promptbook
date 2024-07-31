import spaceTrim from 'spacetrim';
import { ParsingError } from '../../errors/ParsingError';
import type { string_markdown } from '../../types/typeAliases';
import type { CodeBlock } from './extractAllBlocksFromMarkdown';
import { extractAllBlocksFromMarkdown } from './extractAllBlocksFromMarkdown';

/**
 * Extracts exactly ONE code block from markdown.
 *
 * Note: If there are multiple or no code blocks the function throws an error
 *
 * Note: There are 3 simmilar function:
 * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
 * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
 * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
 *
 * @param markdown any valid markdown
 * @returns code block with language and content
 */
export function extractOneBlockFromMarkdown(markdown: string_markdown): CodeBlock {
    const codeBlocks = extractAllBlocksFromMarkdown(markdown);

    if (codeBlocks.length !== 1) {
        throw new ParsingError(
            spaceTrim(
                (block) => `
                    There should be exactly 1 code block, found ${codeBlocks.length} code blocks

                    ${block(codeBlocks.map((block) => block.content).join('\n\n\n---\n\n\n'))}
                `,
            ),
            // <- [🚞]
        );
    }

    return codeBlocks[0]!;
}

/***
 * TODO: [🍓][🌻] Decide of this is internal util, external util OR validator/postprocessor
 */
