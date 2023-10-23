import { string_model_name } from '../../../../../../utils/typeAliases';

/**
 * Prompt result is the simplest concept of execution.
 * It is the result of executing one prompt _(NOT a template)_.
 *
 * @see https://github.com/webgptorg/ptp#prompt-result
 */
export type PromptResult = PromptCompletionResult | PromptChatResult;

/**
 * Prompt completion result
 * It contains only the following text NOT the whole completion
 */
export type PromptCompletionResult = PromptCommonResult;

/**
 * Prompt chat result
 */
export interface PromptChatResult extends PromptCommonResult {
    // TODO: [🤹‍♂️][🧠] Figure out way how to pass thread / previous messages
}

export interface PromptCommonResult {
    /**
     * Exact text response from the model
     */
    readonly content: string;

    /**
     * Name of the model used to generate the response
     */
    readonly model: string_model_name;

    /**
     * Raw response from the model
     */
    readonly rawResponse: object;
}

/**
 * TODO: [🧠] Should here be link to the prompt?
 * TODO: [🧠] Maybe type raw properly - not onject but OpenAI.result.whatever
 * TODO: [🧠] Maybe remove redundant raw.choices.text
 * TODO: Log raw even if prompt failed - log the raw error
 */
