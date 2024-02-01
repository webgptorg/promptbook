import type {
    string_name,
    string_prompt,
    string_ptbk_url_with_hashtemplate,
    string_title,
} from '.././types/typeAliases';
import type { ModelRequirements } from './ModelRequirements';

/**
 * Prompt in a text along with model requirements, but without any execution or templating logic.
 *
 * @see https://github.com/webgptorg/promptbook#prompt
 */
export interface Prompt {
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
     * Unique identifier of the prompt template pipeline with specific template name as hash
     *
     * @example https://ptbk.webgpt.com/cs/write-website-content.ptbk.md@v2.4.15#keywords
     */
    readonly ptbkUrl: string_ptbk_url_with_hashtemplate;

    /**
     * Parameters used in the prompt
     *
     * Note: This is redundant (same information is in ptbkUrl+content) but useful for logging and debugging
     */
    readonly parameters: Record<string_name, string>;
}

/**
 * TODO: [✔] Check ModelRequirements in runtime
 */
