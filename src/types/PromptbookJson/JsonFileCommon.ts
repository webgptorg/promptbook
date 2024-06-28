import type { string_markdown_text } from '../typeAliases';
import type { string_promptbook_url } from '../typeAliases';
import type { string_version } from '../typeAliases';

/**
 * Common properties of the promptbook JSON file / object
 */
export type JsonFileCommon = {
    /**
     * What type of the promptbook JSON file is it
     */
    readonly type: string;

    /**
     * Unique identifier of the promptbook, library, knowledge,...
     *
     * Note: It must be unique across all promptbooks libraries
     * Note: It must use HTTPs URL
     * Tip: You can do versioning in the URL
     *      For example: https://promptbook.webgpt.com/cs/write-website-content.ptbk.md@1.0.0
     * Warning: Do not hash part of the URL, hash part is used for identification of the prompt template in the pipeline
     */
    readonly promptbookUrl?: string_promptbook_url;

    /**
     * Title of the promptbook, library, knowledge,...
     * Note: It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly title: string_markdown_text;

    /**
     * Version of the .ptbk.json file
     */
    readonly promptbookVersion: string_version;

    /**
     * Description of the promptbook, library, knowledge,...
     * It can use multiple paragraphs of simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string_markdown_text;
};
