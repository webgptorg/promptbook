import chalk from 'chalk';
import http from 'http';
import { Server, Socket } from 'socket.io';
import spaceTrim from 'spacetrim';
import { PromptResult } from '../../../PromptResult';
import { Ptps_Error } from './interfaces/Ptps_Error';
import { Ptps_Request } from './interfaces/Ptps_Request';
import { Ptps_Response } from './interfaces/Ptps_Response';
import { RemoteServerOptions } from './interfaces/RemoteServerOptions';

/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 */
export function runRemoteServer(options: RemoteServerOptions) {
    const { port, path, /* [🎛] ptbkLibrary, */ createNaturalExecutionTools, isVerbose } = options;

    const httpServer = http.createServer({}, (request, response) => {
        if (request.url?.includes('socket.io')) {
            return;
        }

        response.write(
            spaceTrim(`
                📖 Server for processing PromptBook requests is running

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
        console.log(chalk.gray(`Client connected`), socket.id);

        socket.on('request', async (request: Ptps_Request) => {
            const { prompt, clientId } = request;
            // TODO: !! Validate here clientId (pass validator as dependency)

            if (isVerbose) {
                console.info(chalk.bgGray(`Prompt:`), chalk.gray(JSON.stringify(request, null, 4)));
            }

            try {
                const executionToolsForClient = createNaturalExecutionTools(clientId);

                // TODO: [🎛] Check validity of the prompt against ptbkLibrary

                let promptResult: PromptResult;
                switch (prompt.modelRequirements.modelVariant) {
                    case 'CHAT':
                        promptResult = await executionToolsForClient.gptChat(prompt);
                        break;
                    case 'COMPLETION':
                        promptResult = await executionToolsForClient.gptComplete(prompt);
                        break;
                    default:
                        throw new Error(`Unknown model variant "${prompt.modelRequirements.modelVariant}"`);
                }

                if (isVerbose) {
                    console.info(chalk.bgGreen(`PromptResult:`), chalk.green(JSON.stringify(promptResult, null, 4)));
                }

                socket.emit('response', { promptResult } satisfies Ptps_Response);
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                socket.emit('error', { errorMessage: error.message } satisfies Ptps_Error);
            } finally {
                socket.disconnect();
            }
        });

        socket.on('disconnect', () => {
            // TODO: Destroy here executionToolsForClient
            if (isVerbose) {
                console.info(chalk.gray(`Client disconnected`), socket.id);
            }
        });
    });

    httpServer.listen(port);

    // Note: We want to log this also in non-verbose mode
    console.info(chalk.bgGreen(`PTP server listening on port ${port}`));
    if (isVerbose) {
        console.info(chalk.green(`Verbose mode is enabled`));
    }
}

/**
 * TODO: !!! This should be name runRemoteServer OR startRemoteServer and return Destroyable OR Promise<Destroyable>
 * TODO: Handle progress - support streaming
 * TODO: [🤹‍♂️] Do not hang up immediately but wait until client closes OR timeout
 * TODO: [🤹‍♂️] Timeout on chat to free up resources
 * TODO: [🃏] Pass here some security token to prevent DDoS
 */
