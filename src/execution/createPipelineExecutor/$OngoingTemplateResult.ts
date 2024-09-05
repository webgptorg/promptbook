import { ExpectError } from '../../errors/ExpectError';
import type { Prompt } from '../../types/Prompt';
import type { ChatPromptResult } from '../PromptResult';
import type { CompletionPromptResult } from '../PromptResult';
import type { EmbeddingPromptResult } from '../PromptResult';
import type { PromptResult } from '../PromptResult';

/**
 * @@@
 *
 * @private internal utility of `createPipelineExecutor`
 */
export type $OngoingTemplateResult = {
    $prompt?: Prompt;
    $chatResult?: ChatPromptResult;
    $completionResult?: CompletionPromptResult;
    $embeddingResult?: EmbeddingPromptResult;
    //  <- Note: [🤖]

    $result: PromptResult | null;
    $resultString: string | null;
    $expectError: ExpectError | null;
    $scriptPipelineExecutionErrors: Array<Error>;
};
