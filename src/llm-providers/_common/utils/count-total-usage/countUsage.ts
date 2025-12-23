import { Subject, type Observable } from 'rxjs';
import type { Promisable } from 'type-fest';
import type { AvailableModel } from '../../../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    ImagePromptResult,
} from '../../../../execution/PromptResult';
import type { Usage } from '../../../../execution/Usage';
import { addUsage } from '../../../../execution/utils/addUsage';
import { ZERO_USAGE } from '../../../../execution/utils/usage-constants';
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt, ImagePrompt } from '../../../../types/Prompt';
import type { LlmExecutionToolsWithTotalUsage } from './LlmExecutionToolsWithTotalUsage';

/**
 * Intercepts LLM tools and counts total usage of the tools
 *
 * @param llmTools LLM tools to be intercepted with usage counting
 * @returns LLM tools with same functionality with added total cost counting
 * @public exported from `@promptbook/core`
 */
export function countUsage(llmTools: LlmExecutionTools): LlmExecutionToolsWithTotalUsage {
    let totalUsage: Usage = ZERO_USAGE;
    const spending = new Subject<Usage>();

    const proxyTools: LlmExecutionToolsWithTotalUsage = {
        get title() {
            return `${llmTools.title} (+usage)`;
            // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
            // <- TODO: [🧈][🧠] Does it make sense to suffix "(+usage)"?
        },

        get description() {
            return `${llmTools.description} (+usage)`;
            // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
            // <- TODO: [🧈][🧠] Does it make sense to suffix "(+usage)"?
        },

        checkConfiguration(): Promisable<void> {
            return /* not await */ llmTools.checkConfiguration();
        },

        listModels(): Promisable<ReadonlyArray<AvailableModel>> {
            return /* not await */ llmTools.listModels();
        },

        spending(): Observable<Usage> {
            return spending.asObservable();
        },

        getTotalUsage() {
            // <- Note: [🥫] Not using getter `get totalUsage` but `getTotalUsage` to allow this object to be proxied
            return totalUsage;
        },
    };

    if (llmTools.callChatModel !== undefined) {
        proxyTools.callChatModel = async (prompt: ChatPrompt): Promise<ChatPromptResult> => {
            // console.info('[🚕] callChatModel through countTotalUsage');
            const promptResult = await llmTools.callChatModel!(prompt);
            totalUsage = addUsage(totalUsage, promptResult.usage);
            spending.next(promptResult.usage);
            return promptResult;
        };
    }

    if (llmTools.callCompletionModel !== undefined) {
        proxyTools.callCompletionModel = async (prompt: CompletionPrompt): Promise<CompletionPromptResult> => {
            // console.info('[🚕] callCompletionModel through countTotalUsage');
            const promptResult = await llmTools.callCompletionModel!(prompt);
            totalUsage = addUsage(totalUsage, promptResult.usage);
            spending.next(promptResult.usage);
            return promptResult;
        };
    }

    if (llmTools.callEmbeddingModel !== undefined) {
        proxyTools.callEmbeddingModel = async (prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult> => {
            // console.info('[🚕] callEmbeddingModel through countTotalUsage');
            const promptResult = await llmTools.callEmbeddingModel!(prompt);
            totalUsage = addUsage(totalUsage, promptResult.usage);
            spending.next(promptResult.usage);
            return promptResult;
        };
    }

    if (llmTools.callImageGenerationModel !== undefined) {
        proxyTools.callImageGenerationModel = async (prompt: ImagePrompt): Promise<ImagePromptResult> => {
            // console.info('[🚕] callImageGenerationModel through countTotalUsage');
            const promptResult = await llmTools.callImageGenerationModel!(prompt);
            totalUsage = addUsage(totalUsage, promptResult.usage);
            spending.next(promptResult.usage);
            return promptResult;
        };
    }

    // <- Note: [🤖]

    return proxyTools;
}

/**
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [🧠][🌯] Maybe a way how to hide ability to `get totalUsage`
 *     > const [llmToolsWithUsage,getUsage] = countTotalUsage(llmTools);
 * TODO: [👷‍♂️] Write a comprehensive manual explaining the construction and usage of LLM tools in the Promptbook ecosystem
 */
