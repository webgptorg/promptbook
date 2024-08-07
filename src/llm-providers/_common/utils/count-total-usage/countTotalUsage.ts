import type { Promisable } from 'type-fest';
import type { AvailableModel, LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
} from '../../../../execution/PromptResult';
import type { PromptResultUsage } from '../../../../execution/PromptResultUsage';
import { addUsage, ZERO_USAGE } from '../../../../execution/utils/addUsage';
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt } from '../../../../types/Prompt';
import type { LlmExecutionToolsWithTotalUsage } from './LlmExecutionToolsWithTotalUsage';

/**
 * Intercepts LLM tools and counts total usage of the tools
 *
 * @param llmTools LLM tools to be intercepted with usage counting
 * @returns LLM tools with same functionality with added total cost counting
 */
export function countTotalUsage(llmTools: LlmExecutionTools): LlmExecutionToolsWithTotalUsage {
    let totalUsage: PromptResultUsage = ZERO_USAGE;

    const proxyTools: LlmExecutionToolsWithTotalUsage = {
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
            console.log('!!!! promptResult.usage callChatModel', promptResult.usage);
            totalUsage = addUsage(totalUsage, promptResult.usage);
            return promptResult;
        };
    }

    if (llmTools.callCompletionModel !== undefined) {
        proxyTools.callCompletionModel = async (prompt: CompletionPrompt): Promise<CompletionPromptResult> => {
            const promptResult = await llmTools.callCompletionModel!(prompt);
            console.log('!!!! promptResult.usage callCompletionModel', promptResult.usage);
            totalUsage = addUsage(totalUsage, promptResult.usage);
            return promptResult;
        };
    }

    if (llmTools.callEmbeddingModel !== undefined) {
        proxyTools.callEmbeddingModel = async (prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult> => {
            const promptResult = await llmTools.callEmbeddingModel!(prompt);
            console.log('!!!! promptResult.usage callEmbeddingModel', promptResult.usage);
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
 * TODO: [🧠][🌯] Maybe a way how to hide ability to `get totalUsage`
 *     > const [llmToolsWithUsage,getUsage] = countTotalUsage(llmTools);
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 */
