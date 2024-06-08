import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import type { Prompt } from '../../../../types/Prompt';
import type { AvailableModel } from '../../../LlmExecutionTools';
import type { LlmExecutionTools } from '../../../LlmExecutionTools';
import type { PromptChatResult } from '../../../PromptResult';
import type { PromptCompletionResult } from '../../../PromptResult';
import type { PromptResult } from '../../../PromptResult';
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
     * Calls remote proxy server to use a chat model.
     */
    public gptChat(prompt: Prompt): Promise<PromptChatResult> {
        if (this.options.isVerbose) {
            console.info(`🖋 Remote gptChat call`);
        }
        return /* not await */ this.gptCommon(prompt);
    }

    /**
     * Calls remote proxy server to use a completion model.
     */
    public gptComplete(prompt: Prompt): Promise<PromptCompletionResult> {
        if (this.options.isVerbose) {
            console.info(`💬 Remote gptComplete call`);
        }
        return /* not await */ this.gptCommon(prompt);
    }

    /**
     * Calls remote proxy server to use both completion or chat model.
     */
    private async gptCommon(prompt: Prompt): Promise<PromptResult> {
        const socket = await this.makeConnection();
        socket.emit('request', { clientId: this.options.clientId, prompt } satisfies Promptbook_Server_Request);

        const promptResult = await new Promise<PromptResult>((resolve, reject) => {
            socket.on('response', (response: Promptbook_Server_Response) => {
                resolve(response.promptResult);
                socket.disconnect();
            });
            socket.on('error', (error: Promptbook_Server_Error) => {
                //            <- TODO: Custom type of error
                reject(new Error(error.errorMessage));
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
