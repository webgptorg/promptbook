import { Subject } from 'rxjs';
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
 * Intercepts LLM tools and counts total usage of the tools.
 *
 * This function wraps the provided `LlmExecutionTools` with a proxy that tracks the cumulative
 * usage (tokens, cost, etc.) across all model calls. It provides a way to monitor spending
 * in real-time through an observable.
 *
 * @param llmTools - The LLM tools to be intercepted and tracked
 * @returns Full proxy of the tools with added usage tracking capabilities
 * @public exported from `@promptbook/core`
 */
export function countUsage<TLlmTools extends LlmExecutionTools>(
    llmTools: TLlmTools,
): TLlmTools & LlmExecutionToolsWithTotalUsage {
    let totalUsage: Usage = ZERO_USAGE;
    const spending = new Subject<Usage>();

    // Create a Proxy to intercept all property access and ensure full proxying of all properties
    const proxyTools = new Proxy(llmTools, {
        get(target, prop, receiver) {
            // Handle title property
            if (prop === 'title') {
                return `${target.title} (+usage)`;
                // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
                // <- TODO: [🧈][🧠] Does it make sense to suffix "(+usage)"?
            }

            // Handle description property
            if (prop === 'description') {
                return `${target.description} (+usage)`;
                // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
                // <- TODO: [🧈][🧠] Does it make sense to suffix "(+usage)"?
            }

            // Handle spending method (new method added by this wrapper)
            if (prop === 'spending') {
                return () => {
                    return spending.asObservable();
                };
            }

            // Handle getTotalUsage method (new method added by this wrapper)
            if (prop === 'getTotalUsage') {
                // <- Note: [🥫] Not using getter `get totalUsage` but `getTotalUsage` to allow this object to be proxied
                return () => {
                    return totalUsage;
                };
            }

            // Handle callChatModel method with usage counting
            if (prop === 'callChatModel' && target.callChatModel !== undefined) {
                return async (prompt: ChatPrompt): Promise<ChatPromptResult> => {
                    // console.info('[🚕] callChatModel through countTotalUsage');
                    const promptResult = await target.callChatModel!(prompt);
                    totalUsage = addUsage(totalUsage, promptResult.usage);
                    spending.next(promptResult.usage);
                    return promptResult;
                };
            }

            // Handle callCompletionModel method with usage counting
            if (prop === 'callCompletionModel' && target.callCompletionModel !== undefined) {
                return async (prompt: CompletionPrompt): Promise<CompletionPromptResult> => {
                    // console.info('[🚕] callCompletionModel through countTotalUsage');
                    const promptResult = await target.callCompletionModel!(prompt);
                    totalUsage = addUsage(totalUsage, promptResult.usage);
                    spending.next(promptResult.usage);
                    return promptResult;
                };
            }

            // Handle callEmbeddingModel method with usage counting
            if (prop === 'callEmbeddingModel' && target.callEmbeddingModel !== undefined) {
                return async (prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult> => {
                    // console.info('[🚕] callEmbeddingModel through countTotalUsage');
                    const promptResult = await target.callEmbeddingModel!(prompt);
                    totalUsage = addUsage(totalUsage, promptResult.usage);
                    spending.next(promptResult.usage);
                    return promptResult;
                };
            }

            // Handle callImageGenerationModel method with usage counting
            if (prop === 'callImageGenerationModel' && target.callImageGenerationModel !== undefined) {
                return async (prompt: ImagePrompt): Promise<ImagePromptResult> => {
                    // console.info('[🚕] callImageGenerationModel through countTotalUsage');
                    const promptResult = await target.callImageGenerationModel!(prompt);
                    totalUsage = addUsage(totalUsage, promptResult.usage);
                    spending.next(promptResult.usage);
                    return promptResult;
                };
            }

            // <- Note: [🤖]

            // For all other properties and methods, delegate to the original target
            const value = Reflect.get(target, prop, receiver);

            // If it's a function, bind it to the target to preserve context
            if (typeof value === 'function') {
                return value.bind(target);
            }

            return value;
        },
    }) as TLlmTools & LlmExecutionToolsWithTotalUsage;

    return proxyTools;
}

/**
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [🧠][🌯] Maybe a way how to hide ability to `get totalUsage`
 *     > const [llmToolsWithUsage,getUsage] = countTotalUsage(llmTools);
 * TODO: [👷‍♂️] Write a comprehensive manual explaining the construction and usage of LLM tools in the Promptbook ecosystem
 */
