import { string_promptbook_url, string_version } from '../typeAliases';
import { PromptTemplateJson } from './PromptTemplateJson';
import { PromptTemplateParameterJson } from './PromptTemplateParameterJson';

/**
 * Promptbook is the **core concept of this library**.
 * It represents a series of prompt templates chained together to form a pipeline / one big prompt template with input and result parameters.
 *
 * @see https://github.com/webgptorg/promptbook#promptbook
 */
export interface PromptbookJson {
    /**
     * Unique identifier of the promptbook
     *
     * Note: It must be unique across all promptbooks libraries
     * Note: It must use HTTPs URL
     * Tip: You can do versioning in the URL
     *      For example: https://promptbook.webgpt.com/cs/write-website-content.ptbk.md@1.0.0
     * Warning: Do not hash part of the URL, hash part is used for identification of the prompt template in the pipeline
     */
    readonly promptbookUrl?: string_promptbook_url;

    /**
     * Title of the promptbook
     * -It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly title: string;

    /**
     * Version of the .ptbk.json file
     */
    readonly promptbookVersion: string_version;

    /**
     * Description of the promptbook
     * It can use multiple paragraphs of simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string;

    /**
     * Set of variables that are used across the pipeline
     */
    readonly parameters: Array<PromptTemplateParameterJson>;

    /**
     * Sequence of prompt templates that are chained together to form a pipeline
     */
    readonly promptTemplates: Array<PromptTemplateJson>;
}

/**
 * TODO: [🧠] Best format of this code?
 *             There must be possible to make
 *             - Branching
 *             - Loops
 *             - Paralelization
 *             - ...and more
 */
