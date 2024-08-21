import type { ErrorJson } from '../../errors/utils/ErrorJson';
import type { PromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../Prompt';

/**
 * Report of single prompt execution
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ExecutionPromptReportJson = {
    /**
     * The prompt wich was executed
     */
    readonly prompt: Omit<Prompt, 'pipelineUrl'>;

    /**
     * Result of the prompt execution (if not failed during LLM execution)
     */
    readonly result?: PromptResult;

    /**
     * The error which occured during LLM execution or during postprocessing or expectation checking
     *
     * Note: It makes sense to have both error and result defined, for example when the result not pass expectations
     */
    readonly error?: ErrorJson;
};
