import type { AvailableModel, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import type { AnthropicClaudeExecutionToolsOptions } from './AnthropicClaudeExecutionToolsOptions';
/**
 * Execution Tools for calling Anthropic Claude API.
 *
 * @public exported from `@promptbook/anthropic-claude`
 */
export declare class AnthropicClaudeExecutionTools implements LlmExecutionTools {
    private readonly options;
    /**
     * Anthropic Claude API client.
     */
    private readonly client;
    /**
     * Creates Anthropic Claude Execution Tools.
     *
     * @param options which are relevant are directly passed to the Anthropic Claude client
     */
    constructor(options?: AnthropicClaudeExecutionToolsOptions);
    get title(): string_title & string_markdown_text;
    get description(): string_markdown;
    /**
     * Calls Anthropic Claude API to use a chat model.
     */
    callChatModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>): Promise<ChatPromptResult>;
    /**
     * Get the model that should be used as default
     */
    private getDefaultModel;
    /**
     * Default model for chat variant.
     */
    private getDefaultChatModel;
    /**
     * List all available Anthropic Claude models that can be used
     */
    listModels(): Array<AvailableModel>;
}
/**
 * TODO:  [🍆] JSON mode
 * TODO: [🧠] Maybe handle errors via transformAnthropicError (like transformAzureError)
 * TODO: Maybe Create some common util for callChatModel and callCompletionModel
 * TODO: Maybe make custom OpenaiError
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: [🍜] Auto use anonymous server in browser
 */
