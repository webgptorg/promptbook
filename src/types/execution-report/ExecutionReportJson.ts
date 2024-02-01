import type { PromptResult } from '../../execution/PromptResult';
import { Prompt } from '../Prompt';

// TODO: !!!!!!!! Header metadata

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
export type ExecutionReportJson = Array<{
    /**
     * !!!!!!
     */
    prompt: Omit<Prompt, 'ptbkUrl' | 'parameters'>;

    /**
     *!!!!!!
     */
    result?: PromptResult;

    /**
     * !!!!!!
     *
     * Note: It makes sense to have both error and result defined, for example when the result not pass expectations
     */
    error?: {
        message: string;
    };
}>;

/**
 * TODO: [🧠] What is the best shape of ExecutionReportJson
 */
