import type { AvailableModel } from '../../execution/LlmExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { CompletionPromptResult } from '../../execution/PromptResult';
import type { EmbeddingPromptResult } from '../../execution/PromptResult';
import type { ChatPrompt } from '../../types/Prompt';
import type { CompletionPrompt } from '../../types/Prompt';
import type { EmbeddingPrompt } from '../../types/Prompt';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
/**
 * Multiple LLM Execution Tools is a proxy server that uses multiple execution tools internally and exposes the executor interface externally.
 *
 * @private Internal utility of `joinLlmExecutionTools`
 */
export declare class MultipleLlmExecutionTools implements LlmExecutionTools {
    /**
     * Array of execution tools in order of priority
     */
    private llmExecutionTools;
    /**
     * Gets array of execution tools in order of priority
     */
    constructor(...llmExecutionTools: Array<LlmExecutionTools>);
    get title(): string_title & string_markdown_text;
    get description(): string_markdown;
    /**
     * Calls the best available chat model
     */
    callChatModel(prompt: ChatPrompt): Promise<ChatPromptResult>;
    /**
     * Calls the best available completion model
     */
    callCompletionModel(prompt: CompletionPrompt): Promise<CompletionPromptResult>;
    /**
     * Calls the best available embedding model
     */
    callEmbeddingModel(prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult>;
    /**
     * Calls the best available model
     */
    private callModelCommon;
    /**
     * List all available models that can be used
     * This lists is a combination of all available models from all execution tools
     */
    listModels(): Promise<Array<AvailableModel>>;
}
/**
 * TODO: [🧠][🎛] Aggregating multiple models - have result not only from one first aviable model BUT all of them
 * TODO: [🏖] If no llmTools have for example not defined `callCompletionModel` this will still return object with defined `callCompletionModel` which just throws `PipelineExecutionError`, make it undefined instead
 *       Look how `countTotalUsage` (and `cacheLlmTools`) implements it
 */
