import type { PromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../Prompt';
import type { string_ptbk_url, string_version } from '../typeAliases';

/**
 * ExecutionReport is result of executing one promptbook
 * It is kind of a variant of the promptbook usefull for debugging, logging and transparency for users.
 *
 * It can have 2 formats:
 * -   **.md file** created from the **JSON** format
 * -   _(this)_ **JSON** format
 *
 * @see https://github.com/webgptorg/promptbook#execution-report
 */
export type ExecutionReportJson = {
    /**
     * Unique identifier of the ptp from ptp which was executed
     */
    readonly ptbkUrl?: string_ptbk_url;

    /**
     * Title of from ptp which was executed
     */
    readonly title?: string;

    // [💕]

    /**
     * Version from ptp which was executed
     */
    readonly ptbkUsedVersion: string_version;

    /**
     * Version from ptp which was requested by promptbook
     */
    readonly ptbkRequestedVersion?: string_version;

    /**
     * Description of the ptp which was executed
     */
    readonly description?: string;

    /**
     * Sequence of prompt templates in order which were executed
     */
    readonly promptExecutions: Array<{
        /**
         * The prompt wich was executed
         */
        prompt: Omit<Prompt, 'ptbkUrl' | 'parameters'>;

        /**
         * Result of the prompt execution (if not failed during LLM execution)
         */
        result?: PromptResult;

        /**
         * The error which occured during LLM execution or during postprocessing or expectation checking
         *
         * Note: It makes sense to have both error and result defined, for example when the result not pass expectations
         */
        error?: {
            message: string;
        };
    }>;
};
