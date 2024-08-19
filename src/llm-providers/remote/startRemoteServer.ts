import colors from 'colors';
import type { IDestroyable } from 'destroyable';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PromptResult } from '../../execution/PromptResult';
import type { really_any } from '../../utils/organization/really_any';
import { PROMPTBOOK_VERSION } from '../../version';
import { createLlmToolsFromConfiguration } from '../_common/createLlmToolsFromConfiguration';
import type { PromptbookServer_Error } from './interfaces/PromptbookServer_Error';
import type { PromptbookServer_ListModels_Request } from './interfaces/PromptbookServer_ListModels_Request';
import type { PromptbookServer_ListModels_Response } from './interfaces/PromptbookServer_ListModels_Response';
import type { PromptbookServer_Prompt_Request } from './interfaces/PromptbookServer_Prompt_Request';
import type { PromptbookServer_Prompt_Response } from './interfaces/PromptbookServer_Prompt_Response';
import type { RemoteServerOptions } from './interfaces/RemoteServerOptions';
import { IS_VERBOSE } from '../../config';

/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 * @public exported from `@promptbook/remote-server`
 */
export function startRemoteServer(options: RemoteServerOptions): IDestroyable {
    const {
        port,
        path,
        collection,
        createLlmExecutionTools,
        //    <- TODO: [🧠][🤺] Remove `createLlmExecutionTools`, pass just `llmExecutionTools`
        isAnonymousModeAllowed,
        isCollectionModeAllowed,
        isVerbose = IS_VERBOSE,
    } = {
        isAnonymousModeAllowed: false,
        isCollectionModeAllowed: false,
        collection: null,
        createLlmExecutionTools: null,
        ...options,
    };
    // <- TODO: [🦪] Some helper type to be able to use discriminant union types with destructuring

    const httpServer = http.createServer({}, async (request, response) => {
        if (request.url?.includes('socket.io')) {
            return;
        }

        response.write(
            await spaceTrim(
                async (block) => `
                    Server for processing promptbook remote requests is running.

                    Version: ${PROMPTBOOK_VERSION}
                    Socket.io path: ${path}/socket.io
                    Anonymouse mode: ${isAnonymousModeAllowed ? 'enabled' : 'disabled'}
                    Collection mode: ${isCollectionModeAllowed ? 'enabled' : 'disabled'}
                    ${block(
                        !isCollectionModeAllowed
                            ? ''
                            : 'Pipelines in collection:\n' +
                                  (await collection!.listPipelines())
                                      .map((pipelineUrl) => `- ${pipelineUrl}`)
                                      .join('\n'),
                    )}

                    For more information look at:
                    https://github.com/webgptorg/promptbook
            `,
            ),
        );
        response.end();
    });

    const server: Server = new Server(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        httpServer,
        {
            path,
            transports: [/*'websocket', <- TODO: [🌬] Make websocket transport work */ 'polling'],
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        },
    );

    server.on('connection', (socket: Socket) => {
        console.info(colors.gray(`Client connected`), socket.id);

        socket.on('prompt-request', async (request: PromptbookServer_Prompt_Request) => {
            const { isAnonymous, prompt, clientId, llmToolsConfiguration } = {
                clientId: null,
                llmToolsConfiguration: null,
                ...request,
            };
            // <- TODO: [🦪] Some helper type to be able to use discriminant union types with destructuring

            if (isVerbose) {
                console.info(colors.bgWhite(`Prompt:`), colors.gray(JSON.stringify(request, null, 4)));
            }

            try {
                if (isAnonymous === true && !isAnonymousModeAllowed) {
                    throw new PipelineExecutionError(`Anonymous mode is not allowed`); // <- TODO: !!! Test
                }

                if (isAnonymous === false && !isCollectionModeAllowed) {
                    throw new PipelineExecutionError(`Collection mode is not allowed`); // <- TODO: !!! Test
                }

                // TODO: !!!! Validate here clientId (pass validator as dependency)

                let llmExecutionTools: LlmExecutionTools;

                if (isAnonymous === true && llmToolsConfiguration !== null) {
                    // Note: Anonymouse mode
                    // TODO: Maybe check that configuration is not empty
                    llmExecutionTools = createLlmToolsFromConfiguration(llmToolsConfiguration, { isVerbose });
                } else if (isAnonymous === false && createLlmExecutionTools !== null) {
                    // Note: Collection mode
                    llmExecutionTools = createLlmExecutionTools(
                        clientId,
                        // <- TODO: [🧠][🤺] clientId should be property of each prompt
                    );

                    if (!(await collection.isResponsibleForPrompt(prompt))) {
                        throw new PipelineExecutionError(`Pipeline is not in the collection of this server`);
                    }
                } else {
                    throw new PipelineExecutionError(
                        `You must provide either llmToolsConfiguration or non-anonymous mode must be propperly configured`,
                    );
                }

                let promptResult: PromptResult;
                switch (prompt.modelRequirements.modelVariant) {
                    case 'CHAT':
                        if (llmExecutionTools.callChatModel === undefined) {
                            // Note: [0] This check should not be a thing
                            throw new PipelineExecutionError(`Chat model is not available`);
                        }
                        promptResult = await llmExecutionTools.callChatModel(prompt);
                        break;

                    case 'COMPLETION':
                        if (llmExecutionTools.callCompletionModel === undefined) {
                            // Note: [0] This check should not be a thing
                            throw new PipelineExecutionError(`Completion model is not available`);
                        }
                        promptResult = await llmExecutionTools.callCompletionModel(prompt);
                        break;

                    case 'EMBEDDING':
                        if (llmExecutionTools.callEmbeddingModel === undefined) {
                            // Note: [0] This check should not be a thing
                            throw new PipelineExecutionError(`Embedding model is not available`);
                        }
                        promptResult = await llmExecutionTools.callEmbeddingModel(prompt);
                        break;

                    // <- case [🤖]:

                    default:
                        throw new PipelineExecutionError(
                            `Unknown model variant "${(prompt as really_any).modelRequirements.modelVariant}"`,
                        );
                }

                if (isVerbose) {
                    console.info(colors.bgGreen(`PromptResult:`), colors.green(JSON.stringify(promptResult, null, 4)));
                }

                socket.emit('prompt-response', { promptResult } satisfies PromptbookServer_Prompt_Response);
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                socket.emit('error', { errorMessage: error.message } satisfies PromptbookServer_Error);
            } finally {
                socket.disconnect();
            }
        });

        // TODO: [👒] Listing models (and checking configuration) probbably should go through REST API not Socket.io
        socket.on('listModels-request', async (request: PromptbookServer_ListModels_Request) => {
            const { isAnonymous, clientId, llmToolsConfiguration } = {
                clientId: null,
                llmToolsConfiguration: null,
                ...request,
            };
            // <- TODO: [🦪] Some helper type to be able to use discriminant union types with destructuring

            if (isVerbose) {
                console.info(colors.bgWhite(`Listing models`));
            }

            try {
                if (isAnonymous === true && !isAnonymousModeAllowed) {
                    throw new PipelineExecutionError(`Anonymous mode is not allowed`); // <- TODO: !!! Test
                }

                if (isAnonymous === false && !isCollectionModeAllowed) {
                    throw new PipelineExecutionError(`Collection mode is not allowed`); // <- TODO: !!! Test
                }

                // TODO: !!!! Validate here clientId (pass validator as dependency)

                let llmExecutionTools: LlmExecutionTools;

                if (isAnonymous === true) {
                    // Note: Anonymouse mode
                    // TODO: Maybe check that configuration is not empty
                    llmExecutionTools = createLlmToolsFromConfiguration(llmToolsConfiguration, { isVerbose });
                } else {
                    // Note: Collection mode
                    llmExecutionTools = createLlmExecutionTools!(
                        clientId,
                        // <- TODO: [🧠][🤺] `clientId` should be property of each prompt
                    );
                }

                const models = await llmExecutionTools.listModels();

                socket.emit('prompt-response', { models } satisfies PromptbookServer_ListModels_Response);
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                socket.emit('error', { errorMessage: error.message } satisfies PromptbookServer_Error);
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
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 * TODO: [⚖] Expose the collection to be able to connect to same collection via createCollectionFromUrl
 * TODO: Handle progress - support streaming
 * TODO: [🗯] Do not hang up immediately but wait until client closes OR timeout
 * TODO: [🗯] Timeout on chat to free up resources
 * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
 * TODO: [0] Set unavailable models as undefined in `RemoteLlmExecutionTools` NOT throw error here
 * TODO: Constrain anonymous mode for specific models / providers
 */
