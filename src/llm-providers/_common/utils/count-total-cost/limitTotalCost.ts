import { LimitReachedError } from '../../../../errors/LimitReachedError';
import { NotYetImplementedError } from '../../../../errors/NotYetImplementedError';
import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
} from '../../../../execution/PromptResult';
import type { PromptResultUsage } from '../../../../execution/PromptResultUsage';
import { ZERO_USAGE } from '../../../../execution/utils/addUsage';
import type { PromptbookStorage } from '../../../../storage/_common/PromptbookStorage';
import { MemoryStorage } from '../../../../storage/memory/MemoryStorage';
import { ChatPrompt, CompletionPrompt, EmbeddingPrompt } from '../../../../types/Prompt';
import type { TODO_any } from '../../../../utils/organization/TODO_any';
import { TODO_USE } from '../../../../utils/organization/TODO_USE';
import { countTotalUsage } from './countTotalCost';
import type { LlmExecutionToolsWithTotalCost } from './LlmExecutionToolsWithTotalCost';

/**
 * Options for `limitTotalCost`
 */
type LimitTotalCostOptions = {
    /**
     * @@@
     *
     * @default ZERO_USAGE
     */
    maxTotalCost: PromptResultUsage;

    /**
     * @@@
     *
     * @default MemoryStorage
     */
    storage: PromptbookStorage<TODO_any>;
};

/**
 * @@@
 */
export function limitTotalCost(
    llmTools: LlmExecutionTools,
    options: Partial<LimitTotalCostOptions> = {},
): LlmExecutionToolsWithTotalCost {
    const { maxTotalCost = ZERO_USAGE, storage = new MemoryStorage() } = options;

    TODO_USE(storage);

    const proxyTools = countTotalUsage(llmTools);

    if (maxTotalCost.price.value !== 0) {
        throw new NotYetImplementedError('`limitTotalCost` is not yet implemented for non-zero price');
    }

    if (proxyTools.callChatModel !== undefined) {
        proxyTools.callChatModel = async (prompt: ChatPrompt): Promise<ChatPromptResult> => {
            TODO_USE(prompt);
            throw new LimitReachedError('Cannot call `callChatModel` because the total cost limit is reached');
        };
    }

    if (proxyTools.callCompletionModel !== undefined) {
        proxyTools.callCompletionModel = async (prompt: CompletionPrompt): Promise<CompletionPromptResult> => {
            TODO_USE(prompt);
            throw new LimitReachedError('Cannot call `callCompletionModel` because the total cost limit is reached');
        };
    }

    if (proxyTools.callEmbeddingModel !== undefined) {
        proxyTools.callEmbeddingModel = async (prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult> => {
            TODO_USE(prompt);
            throw new LimitReachedError('Cannot call `callEmbeddingModel` because the total cost limit is reached');
        };
    }

    // <- Note: [🤖]

    return proxyTools;
}

/**
 * TODO: [🔼] !!! Export via `@promptbookcore/`
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 */
