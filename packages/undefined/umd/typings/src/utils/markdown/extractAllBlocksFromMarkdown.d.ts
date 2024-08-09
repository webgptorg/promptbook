import type { string_markdown } from '../../types/typeAliases';
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
 * @public exported from `@promptbook/markdown-utils`
 */
export declare function extractAllBlocksFromMarkdown(markdown: string_markdown): Array<CodeBlock>;
/**
 * TODO: Maybe name for `blockNotation` instead of  '```' and '>'
 */
