import colors from 'colors';
import type { IDestroyable } from 'destroyable';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { spaceTrim } from 'spacetrim';
import { IS_VERBOSE } from '../../config';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { serializeError } from '../../errors/utils/serializeError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PromptResult } from '../../execution/PromptResult';
import type { really_any } from '../../utils/organization/really_any';
import { PROMPTBOOK_VERSION } from '../../version';
import { createLlmToolsFromConfiguration } from '../_common/register/createLlmToolsFromConfiguration';
import type { PromptbookServer_Error } from './interfaces/PromptbookServer_Error';
import type { PromptbookServer_ListModels_Request } from './interfaces/PromptbookServer_ListModels_Request';
import type { PromptbookServer_ListModels_Response } from './interfaces/PromptbookServer_ListModels_Response';
import type { PromptbookServer_Prompt_Request } from './interfaces/PromptbookServer_Prompt_Request';
import type { PromptbookServer_Prompt_Response } from './interfaces/PromptbookServer_Prompt_Response';
import type { RemoteServerOptions } from './interfaces/RemoteServerOptions';

/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 * @public exported from `@promptbook/remote-server`
 */
export function startRemoteServer<TCustomOptions = undefined>(
    options: RemoteServerOptions<TCustomOptions>,
): IDestroyable {
    const {
        port,
        path,
        collection,
        createLlmExecutionTools,
        isAnonymousModeAllowed,
        isApplicationModeAllowed,
        isVerbose = IS_VERBOSE,
    } = {
        isAnonymousModeAllowed: false,
        isApplicationModeAllowed: false,
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
                    Application mode: ${isApplicationModeAllowed ? 'enabled' : 'disabled'}
                    ${block(
                        !isApplicationModeAllowed
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

    const server: Server = new Server(httpServer, {
        path,
        transports: [/*'websocket', <- TODO: [🌬] Make websocket transport work */ 'polling'],
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    server.on('connection', (socket: Socket) => {
        if (isVerbose) {
            console.info(colors.gray(`Client connected`), socket.id);
        }

        socket.on('prompt-request', async (request: PromptbookServer_Prompt_Request<TCustomOptions>) => {
            const { isAnonymous, prompt, appId, userId, customOptions, llmToolsConfiguration } = {
                appId: null,
                customOptions: undefined,
                llmToolsConfiguration: null,
                ...request,
            };
            // <- TODO: [🦪] Some helper type to be able to use discriminant union types with destructuring

            if (isVerbose) {
                console.info(colors.bgWhite(`Prompt:`), colors.gray(JSON.stringify(request, null, 4)));
            }

            try {
                if (isAnonymous === true && !isAnonymousModeAllowed) {
                    throw new PipelineExecutionError(`Anonymous mode is not allowed`); // <- TODO: [main] !!! Test
                }

                if (isAnonymous === false && !isApplicationModeAllowed) {
                    throw new PipelineExecutionError(`Application mode is not allowed`); // <- TODO: [main] !!! Test
                }

                // TODO: [main] !!!! Validate here userId (pass validator as dependency)

                let llmExecutionTools: LlmExecutionTools;

                if (isAnonymous === true && llmToolsConfiguration !== null) {
                    // Note: Anonymouse mode
                    // TODO: Maybe check that configuration is not empty
                    llmExecutionTools = createLlmToolsFromConfiguration(llmToolsConfiguration, { isVerbose });
                } else if (isAnonymous === false && createLlmExecutionTools !== null) {
                    // Note: Application mode
                    llmExecutionTools = createLlmExecutionTools({
                        appId,
                        userId,
                        customOptions,
                    });

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

                socket.emit(
                    'prompt-response',
                    { promptResult } satisfies PromptbookServer_Prompt_Response /* <- TODO: [🤛] */,
                );
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                socket.emit('error', serializeError(error) satisfies PromptbookServer_Error /* <- TODO: [🤛] */);
            } finally {
                socket.disconnect();
            }
        });

        // TODO: [👒] Listing models (and checking configuration) probbably should go through REST API not Socket.io
        socket.on('listModels-request', async (request: PromptbookServer_ListModels_Request<TCustomOptions>) => {
            const { isAnonymous, appId, userId, customOptions, llmToolsConfiguration } = {
                appId: null,
                customOptions: undefined,
                llmToolsConfiguration: null,
                ...request,
            };
            // <- TODO: [🦪] Some helper type to be able to use discriminant union types with destructuring

            if (isVerbose) {
                console.info(colors.bgWhite(`Listing models`));
            }

            try {
                if (isAnonymous === true && !isAnonymousModeAllowed) {
                    throw new PipelineExecutionError(`Anonymous mode is not allowed`); // <- TODO: [main] !!! Test
                }

                if (isAnonymous === false && !isApplicationModeAllowed) {
                    throw new PipelineExecutionError(`Application mode is not allowed`); // <- TODO: [main] !!! Test
                }

                // TODO: [main] !!!! Validate here userId (pass validator as dependency)

                let llmExecutionTools: LlmExecutionTools;

                if (isAnonymous === true) {
                    // Note: Anonymouse mode
                    // TODO: Maybe check that configuration is not empty
                    llmExecutionTools = createLlmToolsFromConfiguration(llmToolsConfiguration, { isVerbose });
                } else {
                    // Note: Application mode
                    llmExecutionTools = createLlmExecutionTools!({
                        appId,
                        userId,
                        customOptions,
                    });
                }

                const models = await llmExecutionTools.listModels();

                socket.emit(
                    'listModels-response',
                    { models } satisfies PromptbookServer_ListModels_Response /* <- TODO: [🤛] */,
                );
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                socket.emit('error', serializeError(error) satisfies PromptbookServer_Error);
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
        console.info(colors.gray(`Verbose mode is enabled`));
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
 * TODO: Maybe use `$asDeeplyFrozenSerializableJson`
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 * TODO: [⚖] Expose the collection to be able to connect to same collection via createCollectionFromUrl
 * TODO: Handle progress - support streaming
 * TODO: [🗯] Do not hang up immediately but wait until client closes OR timeout
 * TODO: [🗯] Timeout on chat to free up resources
 * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
 * TODO: [0] Set unavailable models as undefined in `RemoteLlmExecutionTools` NOT throw error here
 * TODO: Constrain anonymous mode for specific models / providers
 */
