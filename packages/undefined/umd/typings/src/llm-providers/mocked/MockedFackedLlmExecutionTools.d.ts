import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { AvailableModel, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult, CompletionPromptResult, EmbeddingPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
/**
 * Mocked execution Tools for just faking expected responses for testing purposes
 *
 * @public exported from `@promptbook/fake-llm`
 */
export declare class MockedFackedLlmExecutionTools implements LlmExecutionTools {
    private readonly options;
    constructor(options?: CommonExecutionToolsOptions);
    get title(): string_title & string_markdown_text;
    get description(): string_markdown;
    /**
     * Fakes chat model
     */
    callChatModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'expectations' | 'postprocessing'>): Promise<ChatPromptResult & CompletionPromptResult>;
    /**
     * Fakes completion model
     */
    callCompletionModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'expectations' | 'postprocessing'>): Promise<CompletionPromptResult>;
    /**
     * Fakes embedding model
     */
    callEmbeddingModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'expectations' | 'postprocessing'>): Promise<EmbeddingPromptResult>;
    /**
     * List all available fake-models that can be used
     */
    listModels(): Array<AvailableModel>;
}
/**
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 */
