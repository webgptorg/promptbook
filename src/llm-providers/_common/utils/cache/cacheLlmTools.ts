import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import spaceTrim from 'spacetrim';
import { serializeError } from '../../../../_packages/utils.index';
import { DEFAULT_IS_VERBOSE, MAX_FILENAME_LENGTH } from '../../../../config';
import { assertsError } from '../../../../errors/assertsError';
import { PipelineExecutionError } from '../../../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
} from '../../../../execution/PromptResult';
import { validatePromptResult } from '../../../../execution/utils/validatePromptResult';
import { MemoryStorage } from '../../../../storage/memory/MemoryStorage';
import type { Prompt } from '../../../../types/Prompt';
import { $getCurrentDate } from '../../../../utils/misc/$getCurrentDate';
import { titleToName } from '../../../../utils/normalization/titleToName';
import type { chococake } from '../../../../utils/organization/really_any';
import type { TODO_any } from '../../../../utils/organization/TODO_any';
import { extractParameterNames } from '../../../../utils/parameters/extractParameterNames';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import type { CacheLlmToolsOptions } from './CacheLlmToolsOptions';

/**
 * Intercepts LLM tools and counts total usage of the tools
 *
 * Note: It can take extended `LlmExecutionTools` and cache the
 * Note: Returns full proxy of all LLM tool properties and methods
 *
 * @param llmTools LLM tools to be intercepted with usage counting, it can contain extra methods like `totalUsage`
 * @returns Full proxy of LLM tools with same functionality with added caching
 * @public exported from `@promptbook/core`
 */
export function cacheLlmTools<TLlmTools extends LlmExecutionTools>(
    llmTools: TLlmTools,
    options: Partial<CacheLlmToolsOptions> = {},
): TLlmTools {
    const { storage = new MemoryStorage(), isCacheReloaded = false, isVerbose = DEFAULT_IS_VERBOSE } = options;

    const callCommonModel = async (prompt: Prompt): Promise<TODO_any> => {
        const { parameters, content, modelRequirements } = prompt;
        // <- Note: These are relevant things from the prompt that the cache key should depend on.

        // TODO: Maybe some standalone function for normalization of content for cache
        let normalizedContent = content;
        normalizedContent = normalizedContent.replace(/\s+/g, ' ');
        normalizedContent = normalizedContent.split('\r\n').join('\n');
        normalizedContent = spaceTrim(normalizedContent);

        // Note: Do not need to save everything in the cache, just the relevant parameters
        const relevantParameterNames = extractParameterNames(content);
        const relevantParameters = Object.fromEntries(
            Object.entries(parameters).filter(([key]) => relevantParameterNames.has(key)),
        );

        const keyHashBase = { relevantParameters, normalizedContent, modelRequirements };

        const key = titleToName(
            prompt.title.substring(0, MAX_FILENAME_LENGTH - 10) +
                '-' +
                sha256(hexEncoder.parse(JSON.stringify(keyHashBase)))
                    .toString(/* hex */)
                    .substring(0, 10 - 1),
            //    <- TODO: [🥬] Encapsulate sha256 to some private utility function
        );

        const cacheItem = !isCacheReloaded ? await storage.getItem(key) : null;

        if (cacheItem) {
            return cacheItem.promptResult as ChatPromptResult;
        }

        if (isVerbose) {
            console.info('Cache miss for key:', key, {
                prompt,
                'prompt.title': prompt.title,
                MAX_FILENAME_LENGTH,
                keyHashBase,
                parameters,
                relevantParameters,
                content,
                normalizedContent,
                modelRequirements,
            });
        }

        let promptResult: TODO_any;
        variant: switch (prompt.modelRequirements.modelVariant) {
            case 'CHAT':
                promptResult = await llmTools.callChatModel!(prompt);
                break variant;
            case 'COMPLETION':
                promptResult = await llmTools.callCompletionModel!(prompt);
                break variant;

            case 'EMBEDDING':
                promptResult = await llmTools.callEmbeddingModel!(prompt);
                break variant;

            case 'IMAGE_GENERATION':
                promptResult = await llmTools.callImageGenerationModel!(prompt);
                break variant;

            // <- case [🤖]:

            default:
                throw new PipelineExecutionError(
                    `Unknown model variant "${(prompt as chococake).modelRequirements.modelVariant}"`,
                );
        }

        // TODO: [🧠] !!5 How to do timing in mixed cache / non-cache situation
        // promptResult.timing: FromtoItems

        // Check if the result is valid and should be cached
        // A result is considered failed if:
        // 1. It has a content property that is null or undefined
        // 2. It has an error property that is truthy
        // 3. It has a success property that is explicitly false
        // 4. It doesn't meet the prompt's expectations or format requirements
        const isBasicFailedResult =
            promptResult.content === null ||
            promptResult.content === undefined ||
            (promptResult as chococake).error ||
            (promptResult as chococake).success === false;

        let shouldCache = !isBasicFailedResult;

        // If the basic result is valid, check against expectations and format
        if (shouldCache && promptResult.content) {
            try {
                const validationResult = validatePromptResult({
                    resultString: promptResult.content,
                    expectations: prompt.expectations,
                    format: prompt.format,
                });

                shouldCache = validationResult.isValid;

                if (!shouldCache && isVerbose) {
                    console.info('Not caching result that fails expectations/format validation for key:', key, {
                        content: promptResult.content,
                        expectations: prompt.expectations,
                        format: prompt.format,
                        validationError: validationResult.error?.message,
                    });
                }
            } catch (error) {
                assertsError(error);

                // If validation throws an unexpected error, don't cache
                shouldCache = false;
                if (isVerbose) {
                    console.info('Not caching result due to validation error for key:', key, {
                        content: promptResult.content,
                        validationError: serializeError(error),
                    });
                }
            }
        }

        if (shouldCache) {
            await storage.setItem(key, {
                date: $getCurrentDate(),
                promptbookVersion: PROMPTBOOK_ENGINE_VERSION,
                bookVersion: BOOK_LANGUAGE_VERSION,
                prompt: {
                    ...prompt,
                    parameters:
                        Object.entries(parameters).length === Object.entries(relevantParameters).length
                            ? parameters
                            : {
                                  ...relevantParameters,
                                  note: `<- Note: Only relevant parameters are stored in the cache`,
                              },
                },
                promptResult,
            });
        } else if (isVerbose && isBasicFailedResult) {
            console.info('Not caching failed result for key:', key, {
                content: promptResult.content,
                error: (promptResult as chococake).error,
                success: (promptResult as chococake).success,
            });
        }

        return promptResult;
    };

    // Create a Proxy to intercept all property access and ensure full proxying of all properties
    const proxyTools = new Proxy(llmTools, {
        get(target, prop, receiver) {
            // Handle title property
            if (prop === 'title') {
                return `${target.title} (cached)`;
                // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
                // <- TODO: [🧈][🧠] Does it make sense to suffix "(cached)"?
            }

            // Handle description property
            if (prop === 'description') {
                return `${target.description} (cached)`;
                // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
                // <- TODO: [🧈][🧠] Does it make sense to suffix "(cached)"?
            }

            // Handle callChatModel method
            if (prop === 'callChatModel' && target.callChatModel !== undefined) {
                return async (prompt: Prompt): Promise<ChatPromptResult> => {
                    return /* not await */ callCommonModel(prompt);
                };
            }

            // Handle callCompletionModel method
            if (prop === 'callCompletionModel' && target.callCompletionModel !== undefined) {
                return async (prompt: Prompt): Promise<CompletionPromptResult> => {
                    return /* not await */ callCommonModel(prompt);
                };
            }

            // Handle callEmbeddingModel method
            if (prop === 'callEmbeddingModel' && target.callEmbeddingModel !== undefined) {
                return async (prompt: Prompt): Promise<EmbeddingPromptResult> => {
                    return /* not await */ callCommonModel(prompt);
                };
            }

            // Handle callImageGenerationModel method
            if (prop === 'callImageGenerationModel' && target.callImageGenerationModel !== undefined) {
                return async (prompt: Prompt): Promise<TODO_any> => {
                    return /* not await */ callCommonModel(prompt);
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
    }) as TLlmTools;

    return proxyTools;
}

/**
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [👷‍♂️] Comprehensive manual about construction of llmTools
 *            Detailed explanation about caching strategies and appropriate storage selection for different use cases
 *            Examples of how to combine multiple interceptors for advanced caching, logging, and usage tracking
 */
