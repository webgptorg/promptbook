import type { AvailableModel } from '../../execution/LlmExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { CompletionPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import type { AzureOpenAiExecutionToolsOptions } from './AzureOpenAiExecutionToolsOptions';
/**
 * Execution Tools for calling Azure OpenAI API.
 *
 * @public exported from `@promptbook/azure-openai`
 */
export declare class AzureOpenAiExecutionTools implements LlmExecutionTools {
    private readonly options;
    /**
     * OpenAI Azure API client.
     */
    private readonly client;
    /**
     * Creates OpenAI Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI client
     */
    constructor(options: AzureOpenAiExecutionToolsOptions);
    get title(): string_title & string_markdown_text;
    get description(): string_markdown;
    /**
     * Calls OpenAI API to use a chat model.
     */
    callChatModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>): Promise<ChatPromptResult>;
    /**
     * Calls Azure OpenAI API to use a complete model.
     */
    callCompletionModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>): Promise<CompletionPromptResult>;
    /**
     * Changes Azure error (which is not propper Error but object) to propper Error
     */
    private transformAzureError;
    /**
     * List all available Azure OpenAI models that can be used
     */
    listModels(): Promise<Array<AvailableModel>>;
}
/**
 * TODO: Maybe Create some common util for callChatModel and callCompletionModel
 * TODO: Maybe make custom AzureOpenaiError
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 */
