import type { string_markdown } from './../../types/typeAliases';
import { capitalize } from './../normalization/capitalize';

/**
 * Single code block inside markdown.
 */
export type CodeBlock = {
    /**
     * Language of the code block OR null if the language is not specified in opening ```
     */
    language: string | null;

    /**
     * Content of the code block (unescaped)
     */
    content: string;
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

    let currentCodeBlock: CodeBlock | null = null;

    for (const line of lines) {
        if (line.startsWith('```')) {
            const language = line.slice(3).trim() || null;

            if (currentCodeBlock === null) {
                currentCodeBlock = { language, content: '' };
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
        } else if (currentCodeBlock !== null) {
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
