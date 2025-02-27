import hexEncoder from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";
import type { Promisable } from "type-fest";
import { MAX_FILENAME_LENGTH } from "../../../../config";
import { PipelineExecutionError } from "../../../../errors/PipelineExecutionError";
import type { AvailableModel } from "../../../../execution/AvailableModel";
import type { LlmExecutionTools } from "../../../../execution/LlmExecutionTools";
import type { ChatPromptResult } from "../../../../execution/PromptResult";
import type { CompletionPromptResult } from "../../../../execution/PromptResult";
import type { EmbeddingPromptResult } from "../../../../execution/PromptResult";
import { MemoryStorage } from "../../../../storage/memory/MemoryStorage";
import type { Prompt } from "../../../../types/Prompt";
import { $getCurrentDate } from "../../../../utils/$getCurrentDate";
import { titleToName } from "../../../../utils/normalization/titleToName";
import type { TODO_any } from "../../../../utils/organization/TODO_any";
import type { really_any } from "../../../../utils/organization/really_any";
import { PROMPTBOOK_ENGINE_VERSION } from "../../../../version";
import type { CacheLlmToolsOptions } from "./CacheLlmToolsOptions";

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
	const { storage = new MemoryStorage(), isCacheReloaded = false } = options;

	const proxyTools: TLlmTools = {
		...llmTools,
		// <- Note: [🥫]

		get title() {
			// TODO: [🧠] Maybe put here some suffix
			return llmTools.title;
		},

		get description() {
			// TODO: [🧠] Maybe put here some suffix
			return llmTools.description;
		},

		listModels(): Promisable<ReadonlyArray<AvailableModel>> {
			// TODO: [🧠] Should be model listing also cached?
			return /* not await */ llmTools.listModels();
		},
	};

	const callCommonModel = async (prompt: Prompt): Promise<TODO_any> => {
		const { parameters, content, modelRequirements } = prompt;
		// <- Note: These are relevant things from the prompt that the cache key should depend on.

		const key = titleToName(
			prompt.title.substring(0, MAX_FILENAME_LENGTH - 10) +
				"-" +
				sha256(
					hexEncoder.parse(
						JSON.stringify({ parameters, content, modelRequirements }),
					),
				).toString(/* hex */),
			//    <- TODO: [🥬] Encapsulate sha256 to some private utility function
		);

		const cacheItem = !isCacheReloaded ? await storage.getItem(key) : null;

		if (cacheItem) {
			return cacheItem.promptResult as ChatPromptResult;
		}

		let promptResult: TODO_any;
		switch (prompt.modelRequirements.modelVariant) {
			case "CHAT":
				promptResult = await llmTools.callChatModel!(prompt);
				break;
			case "COMPLETION":
				promptResult = await llmTools.callCompletionModel!(prompt);
				break;

			case "EMBEDDING":
				promptResult = await llmTools.callEmbeddingModel!(prompt);
				break;

			// <- case [🤖]:

			default:
				throw new PipelineExecutionError(
					`Unknown model variant "${(prompt as really_any).modelRequirements.modelVariant}"`,
				);
		}

		// TODO: [🧠] !!5 How to do timing in mixed cache / non-cache situation
		// promptResult.timing: FromtoItems

		await storage.setItem(key, {
			date: $getCurrentDate(),
			promptbookVersion: PROMPTBOOK_ENGINE_VERSION,
			prompt,
			promptResult,
		});

		return promptResult;
	};

	if (llmTools.callChatModel !== undefined) {
		proxyTools.callChatModel = async (
			prompt: Prompt,
		): Promise<ChatPromptResult> => {
			return /* not await */ callCommonModel(prompt);
		};
	}

	if (llmTools.callCompletionModel !== undefined) {
		proxyTools.callCompletionModel = async (
			prompt: Prompt,
		): Promise<CompletionPromptResult> => {
			return /* not await */ callCommonModel(prompt);
		};
	}

	if (llmTools.callEmbeddingModel !== undefined) {
		proxyTools.callEmbeddingModel = async (
			prompt: Prompt,
		): Promise<EmbeddingPromptResult> => {
			return /* not await */ callCommonModel(prompt);
		};
	}

	// <- Note: [🤖]

	return proxyTools;
}

/**
 * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
 * TODO: [🧠] Is there some meaningfull way how to test this util
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 *            @@@ write discussion about this and storages
 *            @@@ write how to combine multiple interceptors
 */
