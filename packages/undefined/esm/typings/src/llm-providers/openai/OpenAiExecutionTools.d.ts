import type { AvailableModel } from '../../execution/LlmExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { CompletionPromptResult } from '../../execution/PromptResult';
import type { EmbeddingPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import type { OpenAiExecutionToolsOptions } from './OpenAiExecutionToolsOptions';
/**
 * Execution Tools for calling OpenAI API.
 *
 * @public exported from `@promptbook/openai`
 */
export declare class OpenAiExecutionTools implements LlmExecutionTools {
    private readonly options;
    /**
     * OpenAI API client.
     */
    private readonly client;
    /**
     * Creates OpenAI Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI client
     */
    constructor(options?: OpenAiExecutionToolsOptions);
    get title(): string_title & string_markdown_text;
    get description(): string_markdown;
    /**
     * Calls OpenAI API to use a chat model.
     */
    callChatModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'expectFormat'>): Promise<ChatPromptResult>;
    /**
     * Calls OpenAI API to use a complete model.
     */
    callCompletionModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>): Promise<CompletionPromptResult>;
    /**
     * Calls OpenAI API to use a embedding model
     */
    callEmbeddingModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>): Promise<EmbeddingPromptResult>;
    /**
     * Get the model that should be used as default
     */
    private getDefaultModel;
    /**
     * Default model for chat variant.
     */
    private getDefaultChatModel;
    /**
     * Default model for completion variant.
     */
    private getDefaultCompletionModel;
    /**
     * Default model for completion variant.
     */
    private getDefaultEmbeddingModel;
    /**
     * List all available OpenAI models that can be used
     */
    listModels(): Array<AvailableModel>;
}
/**
 * TODO: [🧠][🧙‍♂️] Maybe there can be some wizzard for thoose who want to use just OpenAI
 * TODO: Maybe Create some common util for callChatModel and callCompletionModel
 * TODO: Maybe make custom OpenaiError
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 */
