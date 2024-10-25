import { ExpectError } from '../../errors/ExpectError';
import type { Prompt } from '../../types/Prompt';
import type { ChatPromptResult, CompletionPromptResult, EmbeddingPromptResult, PromptResult } from '../PromptResult';

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export type $OngoingTemplateResult = {
    /**
     * @@@
     */
    $prompt?: Prompt;

    /**
     * @@@
     */
    $chatResult?: ChatPromptResult;

    /**
     * @@@
     */
    $completionResult?: CompletionPromptResult;

    /**
     * @@@
     */
    $embeddingResult?: EmbeddingPromptResult;
    //  <- Note: [🤖]

    /**
     * @@@
     */
    $result: PromptResult | null;

    /**
     * @@@
     */
    $resultString: string | null;

    /**
     * @@@
     */
    $expectError: ExpectError | null;

    /**
     * @@@
     */
    $scriptPipelineExecutionErrors: Array<Error>;
};
