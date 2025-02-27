import type { Promisable } from "type-fest";
import type { Prompt } from "../types/Prompt";
import type { string_markdown } from "../types/typeAliases";
import type { string_markdown_text } from "../types/typeAliases";
import type { string_title } from "../types/typeAliases";
import type { AvailableModel } from "./AvailableModel";
import type { ChatPromptResult } from "./PromptResult";
import type { CompletionPromptResult } from "./PromptResult";
import type { EmbeddingPromptResult } from "./PromptResult";

/**
 * Container for all the tools needed to execute prompts to large language models like GPT-4
 * On its interface it exposes common methods for prompt execution.
 * Inside (in constructor) it calls OpenAI, Azure, GPU, proxy, cache, logging,...
 *
 * @see https://github.com/webgptorg/promptbook#llm-execution-tools
 */
export type LlmExecutionTools = {
	/**
	 * Title of the model provider
	 *
	 * @example "OpenAI"
	 */
	readonly title: string_title & string_markdown_text;

	/**
	 * Description of the provider
	 *
	 * @example "Use all models from OpenAI"
	 */
	readonly description?: string_markdown;

	/**
	 * Check comfiguration
	 *
	 * @returns nothing if configuration is correct
	 * @throws {Error} if configuration is incorrect
	 */
	checkConfiguration(): Promisable<void>;

	/**
	 * List all available models that can be used
	 */
	listModels(): Promisable<ReadonlyArray<AvailableModel>>;

	/**
	 * Calls a chat model
	 */
	callChatModel?(prompt: Prompt): Promise<ChatPromptResult>;

	/**
	 * Calls a completion model
	 */
	callCompletionModel?(prompt: Prompt): Promise<CompletionPromptResult>;

	/**
	 * Calls an embedding model
	 */
	callEmbeddingModel?(prompt: Prompt): Promise<EmbeddingPromptResult>;
};

/**
 * TODO: [🍚] Implement destroyable pattern to free resources
 * TODO: [🏳] Add `callTranslationModel`
 * TODO: [🧠] Emulation of one type of model with another one - emuate chat with completion; emulate translation with chat
 * TODO: [🍓][♐] Some heuristic to pick the best model in listed models
 * TODO: [🧠] Should or should not there be a word "GPT" in both callCompletionModel and callChatModel
 * TODO: [🧠][🪐] Should be common things like types, utils in folder containing A,B,C,.. or else outside this listing folder?
 */
