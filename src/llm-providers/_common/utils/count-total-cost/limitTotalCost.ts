import { LimitReachedError } from '../../../../errors/LimitReachedError';
import { NotYetImplementedError } from '../../../../errors/NotYetImplementedError';
import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type {
    PromptChatResult,
    PromptCompletionResult,
    PromptEmbeddingResult,
    PromptResultUsage,
} from '../../../../execution/PromptResult';
import { ZERO_USAGE } from '../../../../execution/utils/addUsage';
import { PromptbookStorage } from '../../../../storage/_common/PromptbookStorage';
import { MemoryStorage } from '../../../../storage/memory/MemoryStorage';
import { Prompt } from '../../../../types/Prompt';
import { TODO } from '../../../../utils/organization/TODO';
import { TODO_USE } from '../../../../utils/organization/TODO_USE';
import type { LlmExecutionToolsWithTotalCost } from './LlmExecutionToolsWithTotalCost';
import { countTotalUsage } from './countTotalCost';

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
    storage: PromptbookStorage<TODO>;
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
        proxyTools.callChatModel = async (prompt: Prompt): Promise<PromptChatResult> => {
            TODO_USE(prompt);
            throw new LimitReachedError('Cannot call `callChatModel` because the total cost limit is reached');
        };
    }

    if (proxyTools.callCompletionModel !== undefined) {
        proxyTools.callCompletionModel = async (prompt: Prompt): Promise<PromptCompletionResult> => {
            TODO_USE(prompt);
            throw new LimitReachedError('Cannot call `callCompletionModel` because the total cost limit is reached');
        };
    }

    if (proxyTools.callEmbeddingModel !== undefined) {
        proxyTools.callEmbeddingModel = async (prompt: Prompt): Promise<PromptEmbeddingResult> => {
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
