import { LimitReachedError } from '../../../../errors/LimitReachedError';
import { NotYetImplementedError } from '../../../../errors/NotYetImplementedError';
import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    ImagePromptResult,
} from '../../../../execution/PromptResult';
import type { Usage } from '../../../../execution/Usage';
import { ZERO_USAGE } from '../../../../execution/utils/usage-constants';
import type { PromptbookStorage } from '../../../../storage/_common/PromptbookStorage';
import { MemoryStorage } from '../../../../storage/memory/MemoryStorage';
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt, ImagePrompt } from '../../../../types/Prompt';
import type { TODO_any } from '../../../../utils/organization/TODO_any';
import { TODO_USE } from '../../../../utils/organization/TODO_USE';
import { countUsage } from './countUsage';
import type { LlmExecutionToolsWithTotalUsage } from './LlmExecutionToolsWithTotalUsage';

/**
 * Options for the `limitTotalUsage` function.
 */
type LimitTotalUsageOptions = {
    /**
     * The usage limits to apply.
     *
     * @default ZERO_USAGE
     */
    maxTotalUsage: Usage;

    /**
     * The storage mechanism to use for tracking usage across multiple executions or instances.
     *
     * @default MemoryStorage which will not persist when the process ends
     */
    storage: PromptbookStorage<TODO_any>;
};

/**
 * Wraps LlmExecutionTools to limit the total usage based on provided limits.
 *
 * @public exported from `@promptbook/core`
 */
export function limitTotalUsage(
    llmTools: LlmExecutionTools,
    options: Partial<LimitTotalUsageOptions> = {},
): LlmExecutionToolsWithTotalUsage {
    const { maxTotalUsage = ZERO_USAGE, storage = new MemoryStorage() } = options;

    TODO_USE(storage);

    const proxyTools = countUsage(llmTools);

    if (maxTotalUsage.price.value !== 0) {
        throw new NotYetImplementedError('`limitTotalUsage` is not yet implemented for non-zero price');

        // TODO: "Cannot call `callChatModel` because the total cost limit is reached"
    }

    if (proxyTools.callChatModel !== undefined) {
        proxyTools.callChatModel = async (prompt: ChatPrompt): Promise<ChatPromptResult> => {
            TODO_USE(prompt);
            throw new LimitReachedError('Cannot call `callChatModel` because you are not allowed to spend any cost');
        };
    }

    if (proxyTools.callCompletionModel !== undefined) {
        proxyTools.callCompletionModel = async (prompt: CompletionPrompt): Promise<CompletionPromptResult> => {
            TODO_USE(prompt);
            throw new LimitReachedError(
                'Cannot call `callCompletionModel` because you are not allowed to spend any cost',
            );
        };
    }

    if (proxyTools.callEmbeddingModel !== undefined) {
        proxyTools.callEmbeddingModel = async (prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult> => {
            TODO_USE(prompt);
            throw new LimitReachedError(
                'Cannot call `callEmbeddingModel` because you are not allowed to spend any cost',
            );
        };
    }

    if (proxyTools.callImageGenerationModel !== undefined) {
        proxyTools.callImageGenerationModel = async (prompt: ImagePrompt): Promise<ImagePromptResult> => {
            TODO_USE(prompt);
            throw new LimitReachedError(
                'Cannot call `callImageGenerationModel` because you are not allowed to spend any cost',
            );
        };
    }

    // <- Note: [🤖]

    return proxyTools;
}

/**
 * TODO: Maybe internally use `countTotalUsage`
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [🧠][🌯] Maybe a way how to hide ability to `get totalUsage`
 * TODO: [👷‍♂️] Write a comprehensive manual about the construction of LLM tools
 */
