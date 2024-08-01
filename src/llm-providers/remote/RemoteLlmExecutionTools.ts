import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../execution/LlmExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PromptChatResult } from '../../execution/PromptResult';
import type { PromptCompletionResult } from '../../execution/PromptResult';
import type { PromptEmbeddingResult } from '../../execution/PromptResult';
import type { PromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import type { RemoteLlmExecutionToolsOptions } from './RemoteLlmExecutionToolsOptions';
import type { Promptbook_Server_Error } from './interfaces/Promptbook_Server_Error';
import type { Promptbook_Server_Request } from './interfaces/Promptbook_Server_Request';
import type { Promptbook_Server_Response } from './interfaces/Promptbook_Server_Response';

/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
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
        return new Promise((resolve, reject) => {
            const socket = io(this.options.remoteUrl.href, {
                path: this.options.path,
                // path: `${this.remoteUrl.pathname}/socket.io`,
                transports: [/*'websocket', <- TODO: [🌬] Make websocket transport work */ 'polling'],
            });

            // console.log('Connecting to', this.options.remoteUrl.href, { socket });

            socket.on('connect', () => {
                resolve(socket);
            });

            setTimeout(() => {
                reject(new Error(`Timeout while connecting to ${this.options.remoteUrl.href}`));
            }, 60000 /* <- TODO: Timeout to config */);
        });
    }

    /**
     * Calls remote proxy server to use a chat model
     */
    public callChatModel(prompt: Prompt): Promise<PromptChatResult> {
        if (this.options.isVerbose) {
            console.info(`🖋 Remote callChatModel call`);
        }
        return /* not await */ this.callModelCommon(prompt) as Promise<PromptChatResult>;
    }

    /**
     * Calls remote proxy server to use a completion model
     */
    public callCompletionModel(prompt: Prompt): Promise<PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info(`💬 Remote callCompletionModel call`);
        }
        return /* not await */ this.callModelCommon(prompt) as Promise<PromptCompletionResult>;
    }

    /**
     * Calls remote proxy server to use a embedding model
     */
    public callEmbeddingModel(prompt: Prompt): Promise<PromptEmbeddingResult> {
        if (this.options.isVerbose) {
            console.info(`💬 Remote callEmbeddingModel call`);
        }
        return /* not await */ this.callModelCommon(prompt) as Promise<PromptEmbeddingResult>;
    }

    // <- Note: [🤖] callXxxModel

    /**
     * Calls remote proxy server to use both completion or chat model
     */
    private async callModelCommon(prompt: Prompt): Promise<PromptResult> {
        const socket = await this.makeConnection();
        socket.emit('request', {
            clientId: this.options.clientId,
            prompt,
            // <- TODO: [🛫] `prompt` is NOT fully serializable as JSON, it contains functions which are not serializable
        } satisfies Promptbook_Server_Request);

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
        return [
            /* !!! */
        ];
    }
}

/**
 * TODO: [🍓] Allow to list compatible models with each variant
 * TODO: [🤹‍♂️] RemoteLlmExecutionTools should extend Destroyable and implement IDestroyable
 */
