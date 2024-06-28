import type { string_markdown_text } from '../typeAliases';
import type { PromptbookJson } from './PromptbookJson';

export type PromptbookLibraryJson = {
    readonly type: 'LIBRARY';

    /**
     * The title of the library
     *
     * Note: It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    title: string_markdown_text;

    /**
     * The description of the library
     *
     * Note: It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    description: string_markdown_text;

    /**
     * Array of promptbooks in the library
     */
    promptbooks: Array<PromptbookJson>;
};
