import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { AvailableModel, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    PromptResult,
} from '../../execution/PromptResult';
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt, Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_title } from '../../types/typeAliases';
import type { Promptbook_Server_Error } from './interfaces/Promptbook_Server_Error';
import type { Promptbook_Server_Request } from './interfaces/Promptbook_Server_Request';
import type { Promptbook_Server_Response } from './interfaces/Promptbook_Server_Response';
import type { RemoteLlmExecutionToolsOptions } from './interfaces/RemoteLlmExecutionToolsOptions';

/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 * @public exported from `@promptbook/remote-client`
 */
export class RemoteLlmExecutionTools implements LlmExecutionTools {
    public constructor(private readonly options: RemoteLlmExecutionToolsOptions) {}

    public get title(): string_title & string_markdown_text {
        // TODO: [🧠] Maybe fetch title+description from the remote server (as well as if model methods are defined)
        return 'Remote server';
    }

    public get description(): string_markdown {
        return 'Use all models by your remote server';
    }

    /**
     * Creates a connection to the remote proxy server.
     */
    private makeConnection(): Promise<Socket> {
        return new Promise(
            //            <- TODO: [🧱] Implement in a functional (not new Class) way
            (resolve, reject) => {
                const socket = io(this.options.remoteUrl, {
                    path: this.options.path,
                    // path: `${this.remoteUrl.pathname}/socket.io`,
                    transports: [/*'websocket', <- TODO: [🌬] Make websocket transport work */ 'polling'],
                });

                // console.log('Connecting to', this.options.remoteUrl.href, { socket });

                socket.on('connect', () => {
                    resolve(socket);
                });

                // TODO: !!!! Better timeout handling

                setTimeout(() => {
                    reject(new Error(`Timeout while connecting to ${this.options.remoteUrl}`));
                }, 1000 /* <- TODO: Timeout to config */);
            },
        );
    }

    /**
     * Calls remote proxy server to use a chat model
     */
    public callChatModel(prompt: ChatPrompt): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info(`🖋 Remote callChatModel call`);
        }
        return /* not await */ this.callCommonModel(prompt) as Promise<ChatPromptResult>;
    }

    /**
     * Calls remote proxy server to use a completion model
     */
    public callCompletionModel(prompt: CompletionPrompt): Promise<CompletionPromptResult> {
        if (this.options.isVerbose) {
            console.info(`💬 Remote callCompletionModel call`);
        }
        return /* not await */ this.callCommonModel(prompt) as Promise<CompletionPromptResult>;
    }

    /**
     * Calls remote proxy server to use a embedding model
     */
    public callEmbeddingModel(prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult> {
        if (this.options.isVerbose) {
            console.info(`💬 Remote callEmbeddingModel call`);
        }
        return /* not await */ this.callCommonModel(prompt) as Promise<EmbeddingPromptResult>;
    }

    // <- Note: [🤖] callXxxModel

    /**
     * Calls remote proxy server to use both completion or chat model
     */
    private async callCommonModel(prompt: Prompt): Promise<PromptResult> {
        const socket = await this.makeConnection();

        if (this.options.isAnonymous) {
            socket.emit('request', {
                llmToolsConfiguration: this.options.llmToolsConfiguration,
                prompt,
                // <- TODO: [🛫] `prompt` is NOT fully serializable as JSON, it contains functions which are not serializable
            } satisfies Promptbook_Server_Request);
        } else {
            socket.emit('request', {
                clientId: this.options.clientId,
                prompt,
                // <- TODO: [🛫] `prompt` is NOT fully serializable as JSON, it contains functions which are not serializable
            } satisfies Promptbook_Server_Request);
        }

        const promptResult = await new Promise<PromptResult>((resolve, reject) => {
            socket.on('response', (response: Promptbook_Server_Response) => {
                resolve(response.promptResult);
                socket.disconnect();
            });
            socket.on('error', (error: Promptbook_Server_Error) => {
                reject(new PipelineExecutionError(error.errorMessage));
                socket.disconnect();
            });
        });

        socket.disconnect();

        return promptResult;
    }

    /**
     * List all available models that can be used
     */
    public async listModels(): Promise<Array<AvailableModel>> {
        return (
            this.options.models ||
            [
                /* !!! */
            ]
        );
    }
}

/**
 * TODO: [🍓] Allow to list compatible models with each variant
 * TODO: [🗯] RemoteLlmExecutionTools should extend Destroyable and implement IDestroyable
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 * TODO: [🧠] Maybe remove `@promptbook/remote-client` and just use `@promptbook/core`
 */
