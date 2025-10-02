import type { string_date_iso8601, string_model_name, string_prompt } from '../types/typeAliases';
import type { TODO_object } from '../utils/organization/TODO_object';
import type { EmbeddingVector } from './EmbeddingVector';
import type { Usage } from './Usage';

/**
 * Prompt result is the simplest concept of execution.
 * It is the result of executing one prompt _(NOT a template)_.
 *
 * @see https://github.com/webgptorg/promptbook#prompt-result
 */
export type PromptResult = CompletionPromptResult | ChatPromptResult | EmbeddingPromptResult /* <- [🤖] */;

/**
 * Completion prompt result
 *
 * Note:It contains only the newly generated text NOT the whole completion
 * Note: [🚉] This is fully serializable as JSON
 */
export type CompletionPromptResult = CommonPromptResult;

/**
 *Chat prompt result
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ChatPromptResult = CommonPromptResult & {
    // TODO: [🗯][🧠] Figure out way how to pass thread / previous messages
};

/**
 * Embedding prompt  result
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type EmbeddingPromptResult = Omit<CommonPromptResult, 'content'> & {
    /**
     * The response from the model
     */
    content: EmbeddingVector;
};

// <- Note: [🤖] Add new model variant here

/**
 * Common properties for all prompt results
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @private just abstract the common properties of the prompt results
 */
export type CommonPromptResult = {
    // TODO: [🗯] Unique messageId + threadId + remoteId
    // TODO: [🗯] prompt

    /**
     * Text response from the model
     */
    readonly content: string;

    /**
     * Name of the model used to generate the response
     */
    readonly modelName: string_model_name;

    /**
     * Timing
     */
    readonly timing: {
        /**
         * Start of the execution
         */
        readonly start: string_date_iso8601;

        /**
         * First token generated
         */
        readonly firstToken?: string_date_iso8601;

        /**
         * End of the execution
         */
        readonly complete: string_date_iso8601;
    };

    /**
     * Usage of the prompt execution
     */
    readonly usage: Usage;

    /**
     * Exact text of the prompt (with all replacements)
     *
     * Note: This contains redundant information
     */
    readonly rawPromptContent: string_prompt;

    /**
     * Raw request to the model
     *
     * Note: This contains redundant information
     */
    readonly rawRequest: TODO_object | null;

    /**
     * Raw response from the model
     *
     * Note: This contains redundant information
     */
    readonly rawResponse: TODO_object;
};

/**
 * TODO: [🧠] Maybe timing more accurate then seconds?
 * TODO: [🧠] Should here be link to the prompt?
 * TODO: [🧠] Maybe type `rawResponse` properly - not onject but OpenAI.result.whatever
 * TODO: [🧠] Maybe remove redundant raw.choices.text
 * TODO: Log raw even if prompt failed - log the raw error
 * TODO: [🏳] Add `TranslationPromptResult`
 */
