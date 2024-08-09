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
import type { RemoteLlmExecutionToolsOptions } from './RemoteLlmExecutionToolsOptions';
/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 * @public exported from `@promptbook/remote-client`
 */
export declare class RemoteLlmExecutionTools implements LlmExecutionTools {
    private readonly options;
    constructor(options: RemoteLlmExecutionToolsOptions);
    get title(): string_title & string_markdown_text;
    get description(): string_markdown;
    /**
     * Creates a connection to the remote proxy server.
     */
    private makeConnection;
    /**
     * Calls remote proxy server to use a chat model
     */
    callChatModel(prompt: ChatPrompt): Promise<ChatPromptResult>;
    /**
     * Calls remote proxy server to use a completion model
     */
    callCompletionModel(prompt: CompletionPrompt): Promise<CompletionPromptResult>;
    /**
     * Calls remote proxy server to use a embedding model
     */
    callEmbeddingModel(prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult>;
    /**
     * Calls remote proxy server to use both completion or chat model
     */
    private callModelCommon;
    /**
     * List all available models that can be used
     */
    listModels(): Promise<Array<AvailableModel>>;
}
/**
 * TODO: [🍓] Allow to list compatible models with each variant
 * TODO: [🗯] RemoteLlmExecutionTools should extend Destroyable and implement IDestroyable
 * TODO: [🍜] Add anonymous option
 */ 
