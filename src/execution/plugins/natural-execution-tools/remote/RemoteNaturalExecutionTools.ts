import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { Prompt } from '../../../../types/Prompt';
import { NaturalExecutionTools } from '../../../NaturalExecutionTools';
import { PromptChatResult, PromptCompletionResult, PromptResult } from '../../../PromptResult';
import { RemoteNaturalExecutionToolsOptions } from './RemoteNaturalExecutionToolsOptions';
import { Ptps_Error } from './interfaces/Ptps_Error';
import { Ptps_Request } from './interfaces/Ptps_Request';
import { Ptps_Response } from './interfaces/Ptps_Response';

/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 */
export class RemoteNaturalExecutionTools implements NaturalExecutionTools {
    public constructor(private readonly options: RemoteNaturalExecutionToolsOptions) {}

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

            console.log('Connecting to', this.options.remoteUrl.href, { socket });

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
        socket.emit('request', { clientId: this.options.clientId, prompt } satisfies Ptps_Request);

        const promptResult = await new Promise<PromptResult>((resolve, reject) => {
            socket.on('response', (response: Ptps_Response) => {
                resolve(response.promptResult);
                socket.disconnect();
            });
            socket.on('error', (error: Ptps_Error) => {
                //            <- TODO: Custom type of error
                reject(new Error(error.errorMessage));
                socket.disconnect();
            });
        });

        socket.disconnect();

        return promptResult;
    }
}

/**
 * TODO: [🤹‍♂️] RemoteNaturalExecutionTools should extend Destroyable and implement IDestroyable
 */
