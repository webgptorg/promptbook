import type { Promisable } from 'type-fest';
import type { AvailableModel } from '../../../../execution/LlmExecutionTools';
import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../../../execution/PromptResult';
import type { CompletionPromptResult } from '../../../../execution/PromptResult';
import type { EmbeddingPromptResult } from '../../../../execution/PromptResult';
import type { PromptResultUsage } from '../../../../execution/PromptResultUsage';
import { addUsage } from '../../../../execution/utils/addUsage';
import { ZERO_USAGE } from '../../../../execution/utils/addUsage';
import type { ChatPrompt } from '../../../../types/Prompt';
import type { CompletionPrompt } from '../../../../types/Prompt';
import type { EmbeddingPrompt } from '../../../../types/Prompt';
import type { LlmExecutionToolsWithTotalCost } from './LlmExecutionToolsWithTotalCost';

/**
 * Intercepts LLM tools and counts total usage of the tools
 *
 * @param llmTools LLM tools to be intercepted with usage counting
 * @returns LLM tools with same functionality with added total cost counting
 */
export function countTotalUsage(llmTools: LlmExecutionTools): LlmExecutionToolsWithTotalCost {
    let totalUsage: PromptResultUsage = ZERO_USAGE;

    const proxyTools: LlmExecutionToolsWithTotalCost = {
        get title() {
            // TODO: [🧠] Maybe put here some suffix
            return llmTools.title;
        },

        get description() {
            // TODO: [🧠] Maybe put here some suffix
            return llmTools.description;
        },

        listModels(): Promisable<Array<AvailableModel>> {
            return /* not await */ llmTools.listModels();
        },

        get totalUsage() {
            return totalUsage;
        },
    };

    if (llmTools.callChatModel !== undefined) {
        proxyTools.callChatModel = async (prompt: ChatPrompt): Promise<ChatPromptResult> => {
            const promptResult = await llmTools.callChatModel!(prompt);
            totalUsage = addUsage(totalUsage, promptResult.usage);
            return promptResult;
        };
    }

    if (llmTools.callCompletionModel !== undefined) {
        proxyTools.callCompletionModel = async (prompt: CompletionPrompt): Promise<CompletionPromptResult> => {
            const promptResult = await llmTools.callCompletionModel!(prompt);
            totalUsage = addUsage(totalUsage, promptResult.usage);
            return promptResult;
        };
    }

    if (llmTools.callEmbeddingModel !== undefined) {
        proxyTools.callEmbeddingModel = async (prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult> => {
            const promptResult = await llmTools.callEmbeddingModel!(prompt);
            totalUsage = addUsage(totalUsage, promptResult.usage);
            return promptResult;
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
