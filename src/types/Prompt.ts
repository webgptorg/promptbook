import type {
    string_name,
    string_prompt,
    string_promptbook_url_with_hashtemplate,
    string_title,
} from '.././types/typeAliases';
import type { PostprocessingFunction } from '../execution/plugins/script-execution-tools/javascript/JavascriptExecutionToolsOptions';
import type { ModelRequirements } from './ModelRequirements';
import type { Expectations } from './PromptbookJson/PromptTemplateJson';

/**
 * Prompt in a text along with model requirements, but without any execution or templating logic.
 *
 * @see https://github.com/webgptorg/promptbook#prompt
 */
export type Prompt = {
    /**
     * The title of the prompt
     *
     * Note: This has no effect on the model, it is just for the reporting
     */
    readonly title: string_title;

    /**
     * The text of the prompt
     *
     * Note: This is not a template, this is exactly the text that will be sent to the model
     * @example "What is the capital of France?"
     */
    readonly content: string_prompt;

    /**
     * Requirements for the model
     */
    readonly modelRequirements: ModelRequirements;

    /**
     * List of postprocessing steps that are executed after the prompt
     */
    readonly postprocessing?: Array<PostprocessingFunction>;

    /**
     * Expectations for the answer
     *
     * For example 5 words, 3 sentences, 2 paragraphs, ...
     * If not set, nothing is expected from the answer
     */
    readonly expectations?: Expectations;

    /**
     * Unique identifier of the promptbook with specific template name as hash
     *
     * @example https://promptbook.webgpt.com/cs/write-website-content.ptbk.md@v2.4.15#keywords
     */
    readonly promptbookUrl: string_promptbook_url_with_hashtemplate;

    /**
     * Parameters used in the prompt
     *
     * Note: This is redundant (same information is in promptbookUrl+content) but useful for logging and debugging
     */
    readonly parameters: Record<string_name, string>;
};

/**
 * TODO: [✔] Check ModelRequirements in runtime
 */
