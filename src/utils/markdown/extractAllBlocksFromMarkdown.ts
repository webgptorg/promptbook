import type { Writable } from 'type-fest';
import type { string_markdown } from '../../types/typeAliases';
import { capitalize } from '../normalization/capitalize';

/**
 * Single code block inside markdown.
 */
export type CodeBlock = {
    /**
     * Which notation was used to open the code block
     */
    readonly blockNotation: '```' | '>';

    /**
     * Language of the code block OR null if the language is not specified in opening ```
     */
    readonly language: string | null;

    /**
     * Content of the code block (unescaped)
     */
    readonly content: string;
};

/**
 * Extracts all code blocks from markdown.
 *
 * Note: There are 3 simmilar function:
 * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
 * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
 * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
 *
 * @param markdown any valid markdown
 * @returns code blocks with language and content
 *
 */
export function extractAllBlocksFromMarkdown(markdown: string_markdown): Array<CodeBlock> {
    const codeBlocks: Array<CodeBlock> = [];
    const lines = markdown.split('\n');

    // Note: [0] Ensure that the last block notated by gt > will be closed
    lines.push('');

    let currentCodeBlock: Writable<CodeBlock> | null = null;

    for (const line of lines) {
        if (line.startsWith('> ')) {
            if (currentCodeBlock === null) {
                currentCodeBlock = { blockNotation: '>', language: null, content: '' };
            } /* not else */

            if (currentCodeBlock.blockNotation === '>') {
                if (currentCodeBlock.content !== '') {
                    currentCodeBlock.content += '\n';
                }

                currentCodeBlock.content += line.slice(2);
            }
        } else if (currentCodeBlock !== null && currentCodeBlock.blockNotation === '>' /* <- Note: [0] */) {
            codeBlocks.push(currentCodeBlock);
            currentCodeBlock = null;
        }

        /* not else */

        if (line.startsWith('```')) {
            const language = line.slice(3).trim() || null;

            if (currentCodeBlock === null) {
                currentCodeBlock = { blockNotation: '```', language, content: '' };
            } else {
                if (language !== null) {
                    // [🌻]
                    throw new Error(
                        `${capitalize(
                            currentCodeBlock.language || 'the',
                        )} code block was not closed and already opening new ${language} code block`,
                    );
                }
                codeBlocks.push(currentCodeBlock);
                currentCodeBlock = null;
            }
        } else if (currentCodeBlock !== null && currentCodeBlock.blockNotation === '```') {
            if (currentCodeBlock.content !== '') {
                currentCodeBlock.content += '\n';
            }

            currentCodeBlock.content += line.split('\\`\\`\\`').join('```') /* <- TODO: Maybe make propper unescape */;
        }
    }

    if (currentCodeBlock !== null) {
        // [🌻]
        throw new Error(
            `${capitalize(currentCodeBlock.language || 'the')} code block was not closed at the end of the markdown`,
        );
    }

    return codeBlocks;
}

/**
 * TODO: Maybe name for `blockNotation` instead of  '```' and '>'
 */
