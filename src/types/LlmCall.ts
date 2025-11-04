import type { ExecutionPromptReportJson } from '../execution/execution-report/ExecutionPromptReportJson';
import type { string_model_name } from './typeAliases';

/**
 * Represents a single LLM call with its report.
 *
 * @see https://github.com/webgptorg/promptbook/issues/24
 */
export type LlmCall = {
    /**
     * The name of the model used for the call.
     */
    readonly modelName: string_model_name;

    /**
     * The report of the LLM execution.
     */
    readonly report: ExecutionPromptReportJson;
};

/**
 * TODO: !!! Maybe different shape of LlmCall
 */
