import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import type { Promisable } from 'type-fest';
import { MAX_FILENAME_LENGTH } from '../../../../config';
import { titleToName } from '../../../../conversion/utils/titleToName';
import { PipelineExecutionError } from '../../../../errors/PipelineExecutionError';
import type { AvailableModel, LlmExecutionTools } from '../../../../execution/LlmExecutionTools';
import type {
    PromptChatResult,
    PromptCompletionResult,
    PromptEmbeddingResult,
} from '../../../../execution/PromptResult';
import { MemoryStorage } from '../../../../storage/memory/MemoryStorage';
import type { Prompt } from '../../../../types/Prompt';
import { $currentDate } from '../../../../utils/currentDate';
import { TODO } from '../../../../utils/organization/TODO';
import { PROMPTBOOK_VERSION } from '../../../../version';
import type { CacheLlmToolsOptions } from './CacheLlmToolsOptions';

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
    const { storage = new MemoryStorage() } = options;

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

    const callCommonModel = async (prompt: Prompt): Promise<TODO> => {
        const key = titleToName(
            prompt.title.substring(0, MAX_FILENAME_LENGTH - 10) +
                '-' +
                sha256(hexEncoder.parse(JSON.stringify(prompt.parameters))).toString(/* hex */),
        );

        const cacheItem = await storage.getItem(key);

        if (cacheItem) {
            return cacheItem.promptResult as PromptChatResult;
        }

        let promptResult: TODO;
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
                throw new PipelineExecutionError(`Unknown model variant "${prompt.modelRequirements!.modelVariant}"`);
        }

        await storage.setItem(key, {
            date: $currentDate(),
            promptbookVersion: PROMPTBOOK_VERSION,
            prompt,
            promptResult,
        });

        return promptResult;
    };

    if (llmTools.callChatModel !== undefined) {
        proxyTools.callChatModel = async (prompt: Prompt): Promise<PromptChatResult> => {
            return /* not await */ callCommonModel(prompt);
        };
    }

    if (llmTools.callCompletionModel !== undefined) {
        proxyTools.callCompletionModel = async (prompt: Prompt): Promise<PromptCompletionResult> => {
            return /* not await */ callCommonModel(prompt);
        };
    }

    if (llmTools.callEmbeddingModel !== undefined) {
        proxyTools.callEmbeddingModel = async (prompt: Prompt): Promise<PromptEmbeddingResult> => {
            return /* not await */ callCommonModel(prompt);
        };
    }

    // <- Note: [🤖]

    return proxyTools;
}

/**
 * TODO: [🔼] !!! Export via `@promptbook/core`
 * TODO: @@@ write discussion about this and storages
 *            write how to combine multiple interceptors
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 */
