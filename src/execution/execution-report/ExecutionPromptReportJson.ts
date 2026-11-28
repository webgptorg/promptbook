import type { ErrorJson } from '../../errors/utils/ErrorJson';
import type { Prompt } from '../../types/Prompt';
import type { PromptResult } from '../PromptResult';

/**
 * Report of single prompt execution
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ExecutionPromptReportJson = {
    /**
     * The prompt which was executed
     */
    readonly prompt: Omit<Prompt, 'pipelineUrl'>;

    /**
     * Result of the prompt execution (if not failed during LLM execution)
     */
    readonly result?: PromptResult;

    /**
     * The error which occurred during LLM execution or during postprocessing or expectation checking
     *
     * Note: It makes sense to have both error and result defined, for example when the result not pass expectations
     */
    readonly error?: ErrorJson;
};
