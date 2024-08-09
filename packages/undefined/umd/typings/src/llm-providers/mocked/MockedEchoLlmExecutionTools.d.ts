import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { AvailableModel } from '../../execution/LlmExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { CompletionPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
/**
 * Mocked execution Tools for just echoing the requests for testing purposes.
 *
 * @public exported from `@promptbook/fake-llm`
 */
export declare class MockedEchoLlmExecutionTools implements LlmExecutionTools {
    private readonly options;
    constructor(options?: CommonExecutionToolsOptions);
    get title(): string_title & string_markdown_text;
    get description(): string_markdown;
    /**
     * Mocks chat model
     */
    callChatModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>): Promise<ChatPromptResult>;
    /**
     * Mocks completion model
     */
    callCompletionModel(prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>): Promise<CompletionPromptResult>;
    /**
     * List all available mocked-models that can be used
     */
    listModels(): Array<AvailableModel>;
}
/**
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: Allow in spaceTrim: nesting with > ${block(prompt.request)}, same as replace params
 */
