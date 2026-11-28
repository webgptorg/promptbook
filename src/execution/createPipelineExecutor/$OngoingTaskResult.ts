import { ExpectError } from '../../errors/ExpectError';
import type { Prompt } from '../../types/Prompt';
import type { ChatPromptResult } from '../PromptResult';
import type { CompletionPromptResult } from '../PromptResult';
import type { EmbeddingPromptResult } from '../PromptResult';
import type { PromptResult } from '../PromptResult';

/**
 * Represents the ongoing result of a pipeline task execution
 *
 * Used internally by the pipeline executor to track state during execution attempts
 *
 * @private internal utility of `createPipelineExecutor`
 */
export type $OngoingTaskResult = {
    /**
     * The prompt object used for the current execution attempt, if applicable.
     */
    $prompt?: Prompt;

    /**
     * The result of a chat model execution, if applicable.
     */
    $chatResult?: ChatPromptResult;

    /**
     * The result of a completion model execution, if applicable.
     */
    $completionResult?: CompletionPromptResult;

    /**
     * The result of an embedding model execution, if applicable.
     * Note: [🤖] Embedding results are less common in standard pipelines.
     */
    $embeddingResult?: EmbeddingPromptResult;
    //  <- Note: [🤖]

    /**
     * The final result object for the task, or null if not yet available.
     */
    $result: PromptResult | null;

    /**
     * The result string produced by the task, or null if not yet available.
     */
    $resultString: string | null;

    /**
     * The last expectation error encountered, or null if none.
     */
    $expectError: ExpectError | null;

    /**
     * List of errors encountered during script postprocessing or execution.
     */
    $scriptPipelineExecutionErrors: Array<Error>;

    /**
     * Array of all failed attempts, storing both the result string and the error for each failure
     */
    $failedResults: Array<{
        attemptIndex: number;
        result: string | null;
        error: ExpectError;
    }>;
};
