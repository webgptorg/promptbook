import spaceTrim from 'spacetrim';
import { ParseError } from '../../errors/ParseError';
import type { string_markdown } from '../../types/typeAliases';
import type { CodeBlock } from './extractAllBlocksFromMarkdown';
import { extractAllBlocksFromMarkdown } from './extractAllBlocksFromMarkdown';

/**
 * Extracts exactly ONE code block from markdown.
 *
 * - When there are multiple or no code blocks the function throws a `ParseError`
 *
 * Note: There are multiple simmilar function:
 * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
 * - `extractJsonBlock` extracts exactly one valid JSON code block
 * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
 * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
 *
 * @param markdown any valid markdown
 * @returns code block with language and content
 * @public exported from `@promptbook/markdown-utils`
 * @throws {ParseError} if there is not exactly one code block in the markdown
 */
export function extractOneBlockFromMarkdown(markdown: string_markdown): CodeBlock {
    const codeBlocks = extractAllBlocksFromMarkdown(markdown);

    if (codeBlocks.length !== 1) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    There should be exactly 1 code block in template, found ${codeBlocks.length} code blocks

                    ${block(codeBlocks.map((block, i) => `Block ${i + 1}:\n${block.content}`).join('\n\n\n'))}
                `,
            ),
            // <- [🚞]
        );
    }

    return codeBlocks[0]!;
}

/***
 * TODO: [🍓][🌻] Decide of this is internal utility, external util OR validator/postprocessor
 */
