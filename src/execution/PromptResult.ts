import type { KebabCase } from 'type-fest';
import { ExpectationUnit } from '../_packages/types.index';
import type { number_positive, number_usd, string_date_iso8601, string_model_name } from '../types/typeAliases';

/**
 * Prompt result is the simplest concept of execution.
 * It is the result of executing one prompt _(NOT a template)_.
 *
 * @see https://github.com/webgptorg/promptbook#prompt-result
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
export type PromptChatResult = PromptCommonResult & {
    // TODO: [🤹‍♂️][🧠] Figure out way how to pass thread / previous messages
};

export type PromptCommonResult = {
    /**
     * Exact text response from the model
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
        start: string_date_iso8601;

        /**
         * First token generated
         */
        firstToken?: string_date_iso8601;

        /**
         * End of the execution
         */
        complete: string_date_iso8601;
    };

    /**
     * Usage of the prompt execution
     */
    readonly usage: PromptResultUsage;

    /**
     * Raw response from the model
     */
    readonly rawResponse: object;
};

/**
 * Usage statistics for one or many prompt results
 */
export type PromptResultUsage = {
    /**
     * Cost of the execution in USD
     *
     * Note: If the cost is unknown, the value 0 and isUncertain is true
     */
    price: UncertainNumber;

    /**
     * Number of whatever used in the input aka. `prompt_tokens`
     */
    input: PromptResultUsageCounts;

    /**
     * Number of tokens used in the output aka. `completion_tokens`
     */
    output: PromptResultUsageCounts;
};

/**
 * Record of all possible measurable units
 */
export type PromptResultUsageCounts = Record<`${KebabCase<'TOKENS' | ExpectationUnit>}Count`, UncertainNumber>;

/**
 * Number which can be uncertain
 *
 * Note: If the value is completelly unknown, the value 0 and isUncertain is true
 * Note: Not using NaN or null because it looses the value which is better to be uncertain then not to be at all
 */
export type UncertainNumber = {
    /**
     * The numeric value
     */
    value: number_usd & (number_positive | 0);

    /**
     * Is the value uncertain
     */
    isUncertain?: true;
};

/**
 * TODO: [🧠] Maybe timing more accurate then seconds?
 * TODO: [🧠] Should here be link to the prompt?
 * TODO: [🧠] Maybe type raw properly - not onject but OpenAI.result.whatever
 * TODO: [🧠] Maybe remove redundant raw.choices.text
 * TODO: Log raw even if prompt failed - log the raw error
 */
