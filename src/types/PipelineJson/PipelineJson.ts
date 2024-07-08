import type { string_markdown_text, string_pipeline_url, string_version } from '../typeAliases';
import type { KnowledgeJson } from './KnowledgeJson';
import type { PromptTemplateJson } from './PromptTemplateJson';
import type { PromptTemplateParameterJson } from './PromptTemplateParameterJson';

/**
 * Promptbook is the **core concept of this library**.
 * It represents a series of prompt templates chained together to form a pipeline / one big prompt template with input and result parameters.
 *
 * @see !!! https://github.com/webgptorg/promptbook#promptbook
 */
export type PipelineJson = {
    /**
     * Unique identifier of the promptbook
     *
     * Note: It must be unique across all promptbooks libraries
     * Note: It must use HTTPs URL
     * Tip: You can do versioning in the URL
     *      For example: https://promptbook.webgpt.com/cs/write-website-content.ptbk.md@1.0.0
     * Warning: Do not hash part of the URL, hash part is used for identification of the prompt template in the pipeline
     */
    readonly promptbookUrl?: string_pipeline_url;

    /**
     * Title of the promptbook
     * -It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly title: string_markdown_text;

    /**
     * Version of the .ptbk.json file
     */
    readonly promptbookVersion: string_version;

    /**
     * Description of the promptbook
     * It can use multiple paragraphs of simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string_markdown_text;

    /**
     * Set of variables that are used across the pipeline
     */
    readonly parameters: Array<PromptTemplateParameterJson>;

    /**
     * Sequence of prompt templates that are chained together to form a pipeline
     */
    readonly promptTemplates: Array<PromptTemplateJson>;

    /**
     * Set of information that are used as external knowledge in the pipeline
     */
    readonly knowledge: KnowledgeJson;
};

/**
 * Note: There was a proposal for multiple types of promptbook objects 78816ff33e2705ee1a187aa2eb8affd976d4ea1a
 *       But then immediately reverted back to the single type
 *       With knowledge as part of the promptbook and library just as a collection of promptbooks
 */
