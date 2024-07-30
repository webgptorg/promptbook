import type { Promisable } from 'type-fest';
import type { AvailableModel, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PromptChatResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';

type CacheLlmToolsOptions = {
    /**
     * Total cost of the execution
     *
     * @default @@@
     */
    storage: Storage; // <- TODO: !!!! Import and change name to PromptbookStorage / AsyncStorage
};

/**
 * Intercepts LLM tools and counts total usage of the tools
 *
 * @param llmTools LLM tools to be intercepted with usage counting
 * @returns LLM tools with same functionality with added total cost counting
 */
export function cacheLlmTools(
    llmTools: LlmExecutionTools,
    options: Partial<CacheLlmToolsOptions> = {},
): LlmExecutionTools {
    const { storage = {} } = options;

    const proxyTools: LlmExecutionTools = {
        get title() {
            // TODO: [🧠] Maybe put here some suffix
            return llmTools.title;
        },

        get description() {
            // TODO: [🧠] Maybe put here some suffix
            return llmTools.description;
        },

        listModels(): Promisable<Array<AvailableModel>> {
            // TODO: [🧠] Should be model listing also cached?
            return /* not await */ llmTools.listModels();
        },
    };

    if (llmTools.callChatModel !== undefined) {
        proxyTools.callChatModel = async (prompt: Prompt): Promise<PromptChatResult> => {
            const promptResult = await llmTools.callChatModel!(prompt);
            return promptResult;
        };
    }

    /*
    TODO: !!!!
    if (llmTools.callCompletionModel !== undefined) {
        proxyTools.callCompletionModel = async (prompt: Prompt): Promise<PromptCompletionResult> => {};
    }

    if (llmTools.callEmbeddingModel !== undefined) {
        proxyTools.callEmbeddingModel = async (prompt: Prompt): Promise<PromptEmbeddingResult> => {};
    }
    */

    // <- Note: [🤖]

    return proxyTools;
}

/**
 * TODO: !!!!! Export this util
 * TODO: !!!!! Use this for tests in promptbook project itself
 * TODO: !!!! write discussion about this and storages
 *            write how to combine multiple interceptors
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 */
