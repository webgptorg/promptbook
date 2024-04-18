import colors from 'colors';
import type { IDestroyable } from 'destroyable';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { spaceTrim } from 'spacetrim';
import { PromptbookExecutionError } from '../../../../errors/PromptbookExecutionError';
import { PROMPTBOOK_VERSION } from '../../../../version';
import { PromptResult } from '../../../PromptResult';
import { Promptbook_Server_Error } from './interfaces/Promptbook_Server_Error';
import { Promptbook_Server_Request } from './interfaces/Promptbook_Server_Request';
import { Promptbook_Server_Response } from './interfaces/Promptbook_Server_Response';
import { RemoteServerOptions } from './interfaces/RemoteServerOptions';

/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 */
export function startRemoteServer(options: RemoteServerOptions): IDestroyable {
    const { port, path, library, createNaturalExecutionTools, isVerbose } = options;

    const httpServer = http.createServer({}, (request, response) => {
        if (request.url?.includes('socket.io')) {
            return;
        }

        response.write(
            spaceTrim(`
                Server for processing promptbook remote requests is running.

                Version: ${PROMPTBOOK_VERSION}

                For more information look at:
                https://github.com/webgptorg/promptbook

            `),
        );
        response.end();
    });

    const server: Server = new Server(httpServer, {
        path,
        transports: [/*'websocket', <- TODO: [🌬] Make websocket transport work */ 'polling'],
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    server.on('connection', (socket: Socket) => {
        console.info(colors.gray(`Client connected`), socket.id);

        socket.on('request', async (request: Promptbook_Server_Request) => {
            const { prompt, clientId } = request;
            // TODO: !! Validate here clientId (pass validator as dependency)

            if (isVerbose) {
                console.info(colors.bgWhite(`Prompt:`), colors.gray(JSON.stringify(request, null, 4)));
            }

            try {
                const executionToolsForClient = createNaturalExecutionTools(clientId);

                if (!(await library.isResponsibleForPrompt(prompt))) {
                    throw new PromptbookExecutionError(`Prompt is not in the library of this server`);
                }

                let promptResult: PromptResult;
                switch (prompt.modelRequirements.modelVariant) {
                    case 'CHAT':
                        promptResult = await executionToolsForClient.gptChat(prompt);
                        break;
                    case 'COMPLETION':
                        promptResult = await executionToolsForClient.gptComplete(prompt);
                        break;
                    default:
                        throw new PromptbookExecutionError(
                            `Unknown model variant "${prompt.modelRequirements.modelVariant}"`,
                        );
                }

                if (isVerbose) {
                    console.info(colors.bgGreen(`PromptResult:`), colors.green(JSON.stringify(promptResult, null, 4)));
                }

                socket.emit('response', { promptResult } satisfies Promptbook_Server_Response);
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                socket.emit('error', { errorMessage: error.message } satisfies Promptbook_Server_Error);
            } finally {
                socket.disconnect();
            }
        });

        socket.on('disconnect', () => {
            // TODO: Destroy here executionToolsForClient
            if (isVerbose) {
                console.info(colors.gray(`Client disconnected`), socket.id);
            }
        });
    });

    httpServer.listen(port);

    // Note: We want to log this also in non-verbose mode
    console.info(colors.bgGreen(`PROMPTBOOK server listening on port ${port}`));
    if (isVerbose) {
        console.info(colors.green(`Verbose mode is enabled`));
    }

    let isDestroyed = false;

    return {
        get isDestroyed() {
            return isDestroyed;
        },
        destroy() {
            if (isDestroyed) {
                return;
            }
            isDestroyed = true;
            httpServer.close();
            server.close();
        },
    };
}

/**
 * TODO: Handle progress - support streaming
 * TODO: [🤹‍♂️] Do not hang up immediately but wait until client closes OR timeout
 * TODO: [🤹‍♂️] Timeout on chat to free up resources
 * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
 */
