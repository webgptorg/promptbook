import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import spaceTrim from 'spacetrim';
import type { Promisable } from 'type-fest';
import { DEFAULT_IS_VERBOSE, MAX_FILENAME_LENGTH } from '../../../../config';
import { PipelineExecutionError } from '../../../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../../../execution/AvailableModel';
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
 *
 * @param llmTools LLM tools to be intercepted with usage counting, it can contain extra methods like `totalUsage`
 * @returns LLM tools with same functionality with added total cost counting
 * @public exported from `@promptbook/core`
 */
export function cacheLlmTools<TLlmTools extends LlmExecutionTools>(
    llmTools: TLlmTools,
    options: Partial<CacheLlmToolsOptions> = {},
): TLlmTools {
    const { storage = new MemoryStorage(), isCacheReloaded = false, isVerbose = DEFAULT_IS_VERBOSE } = options;

    const proxyTools: TLlmTools = {
        ...llmTools,
        // <- Note: [🥫]

        get title() {
            return `${llmTools.title} (cached)`;
            // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
            // <- TODO: [🧈][🧠] Does it make sense to suffix "(cached)"?
        },

        get description() {
            return `${llmTools.description} (cached)`;
            // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
            // <- TODO: [🧈][🧠] Does it make sense to suffix "(cached)"?
        },

        listModels(): Promisable<ReadonlyArray<AvailableModel>> {
            // TODO: [🧠] Should be model listing also cached?
            return /* not await */ llmTools.listModels();
        },
    };

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
                // If validation throws an unexpected error, don't cache
                shouldCache = false;
                if (isVerbose) {
                    console.info('Not caching result due to validation error for key:', key, {
                        content: promptResult.content,
                        validationError: error instanceof Error ? error.message : String(error),
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

    if (llmTools.callChatModel !== undefined) {
        proxyTools.callChatModel = async (prompt: Prompt): Promise<ChatPromptResult> => {
            return /* not await */ callCommonModel(prompt);
        };
    }

    if (llmTools.callCompletionModel !== undefined) {
        proxyTools.callCompletionModel = async (prompt: Prompt): Promise<CompletionPromptResult> => {
            return /* not await */ callCommonModel(prompt);
        };
    }

    if (llmTools.callEmbeddingModel !== undefined) {
        proxyTools.callEmbeddingModel = async (prompt: Prompt): Promise<EmbeddingPromptResult> => {
            return /* not await */ callCommonModel(prompt);
        };
    }

    // <- Note: [🤖]

    return proxyTools;
}

/**
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [👷‍♂️] Comprehensive manual about construction of llmTools
 *            Detailed explanation about caching strategies and appropriate storage selection for different use cases
 *            Examples of how to combine multiple interceptors for advanced caching, logging, and usage tracking
 */
