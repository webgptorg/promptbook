import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import type { IDestroyable } from 'destroyable';
import express from 'express';
import http from 'node:http';
import { Server, Socket } from 'socket.io';
import { spaceTrim } from 'spacetrim';
import { CLAIM } from '../config';
import { DEFAULT_IS_VERBOSE } from '../config';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { serializeError } from '../errors/utils/serializeError';
import { $provideExecutablesForNode } from '../executables/$provideExecutablesForNode';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTask } from '../execution/ExecutionTask';
import type { ExecutionTools } from '../execution/ExecutionTools';
import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import type { PromptResult } from '../execution/PromptResult';
import { createLlmToolsFromConfiguration } from '../llm-providers/_common/register/createLlmToolsFromConfiguration';
import { preparePipeline } from '../prepare/preparePipeline';
import { $provideFilesystemForNode } from '../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../scrapers/_common/register/$provideScrapersForNode';
import type { InputParameters } from '../types/typeAliases';
import type { string_pipeline_url } from '../types/typeAliases';
import { keepTypeImported } from '../utils/organization/keepTypeImported';
import type { really_any } from '../utils/organization/really_any';
import type { TODO_any } from '../utils/organization/TODO_any';
import { BOOK_LANGUAGE_VERSION } from '../version';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';
import type { PromptbookServer_Error } from './socket-types/_common/PromptbookServer_Error';
import type { PromptbookServer_Identification } from './socket-types/_subtypes/PromptbookServer_Identification';
import type { PromptbookServer_ListModels_Request } from './socket-types/listModels/PromptbookServer_ListModels_Request';
import type { PromptbookServer_ListModels_Response } from './socket-types/listModels/PromptbookServer_ListModels_Response';
import type { PromptbookServer_PreparePipeline_Request } from './socket-types/prepare/PromptbookServer_PreparePipeline_Request';
import type { PromptbookServer_PreparePipeline_Response } from './socket-types/prepare/PromptbookServer_PreparePipeline_Response';
import type { PromptbookServer_Prompt_Request } from './socket-types/prompt/PromptbookServer_Prompt_Request';
import type { PromptbookServer_Prompt_Response } from './socket-types/prompt/PromptbookServer_Prompt_Response';
import type { RemoteServerOptions } from './types/RemoteServerOptions';

keepTypeImported<PromptbookServer_Prompt_Response>(); // <- Note: [🤛]
keepTypeImported<PromptbookServer_Error>(); // <- Note: [🤛]
keepTypeImported<PromptbookServer_ListModels_Response>(); // <- Note: [🤛]

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

        collection,
        createLlmExecutionTools,
        isAnonymousModeAllowed,
        isApplicationModeAllowed,
        isVerbose = DEFAULT_IS_VERBOSE,
    } = {
        isAnonymousModeAllowed: false,
        isApplicationModeAllowed: false,
        collection: null,
        createLlmExecutionTools: null,
        ...options,
    };
    // <- TODO: [🦪] Some helper type to be able to use discriminant union types with destructuring
    let { rootPath = '/' } = options;

    if (!rootPath.startsWith('/')) {
        rootPath = `/${rootPath}`;
    } /* not else */
    if (rootPath.endsWith('/')) {
        rootPath = rootPath.slice(0, -1);
    } /* not else */
    if (rootPath === '/') {
        rootPath = '';
    }

    const socketioPath =
        '/' +
        `${rootPath}/socket.io`
            .split('/')
            .filter((part) => part !== '')
            .join('/');

    const startupDate = new Date();

    const app = express();

    app.use(express.json());
    app.use(function (request, response, next) {
        response.setHeader('X-Powered-By', 'Promptbook engine');
        next();
    });

    const runningExecutionTasks: Array<ExecutionTask> = [];

    // TODO: !!!!!! Do here some garbage collection of finished tasks

    app.get(['/', rootPath], async (request, response) => {
        if (request.url?.includes('socket.io')) {
            return;
        }

        response.type('text/markdown').send(
            await spaceTrim(
                async (block) => `
                    # Promptbook

                    > ${block(CLAIM)}

                    **Book language version:** ${BOOK_LANGUAGE_VERSION}
                    **Promptbook engine version:** ${PROMPTBOOK_ENGINE_VERSION}
                    **Node.js version:** ${process.version /* <- TODO: [🧠] Is it secure to expose this */}

                    ---

                    ## Details

                    **Server port:** ${port}
                    **Server root path:** ${rootPath}
                    **Socket.io path:** ${socketioPath}
                    **Startup date:** ${startupDate.toISOString()}
                    **Anonymouse mode:** ${isAnonymousModeAllowed ? 'enabled' : 'disabled'}
                    **Application mode:** ${isApplicationModeAllowed ? 'enabled' : 'disabled'}
                    ${block(
                        !isApplicationModeAllowed || collection === null
                            ? ''
                            : '**Pipelines in collection:**\n' +
                                  (await collection.listPipelines())
                                      .map((pipelineUrl) => `- ${pipelineUrl}`)
                                      .join('\n'),
                    )}
                    **Running executions:** ${runningExecutionTasks.length}

                    ---

                    ## Paths

                    ${block(
                        app._router.stack
                            .map(({ route }: really_any) => route?.path || null)
                            .filter((path: string) => path !== null)
                            .map((path: string) => `- ${path}`)
                            .join('\n'),
                    )}

                    ---

                    ## Instructions

                    To connect to this server use:

                    1) The client https://www.npmjs.com/package/@promptbook/remote-client
                    2) OpenAI compatible client *(Not wotking yet)*
                    3) REST API

                    For more information look at:
                    https://github.com/webgptorg/promptbook
                `,
            ),
            // <- TODO: [🗽] Unite branding and make single place for it
        );
    });

    app.get(`${rootPath}/books`, async (request, response) => {
        response.send(collection === null ? [] : await collection.listPipelines());
    });

    app.get(`${rootPath}/executions`, async (request, response) => {
        response.send(
            runningExecutionTasks,
            // <- TODO: !!! Better and more information
        );
    });

    app.get(`${rootPath}/executions/:taskId`, async (request, response) => {
        const { taskId } = request.params;

        const execution = runningExecutionTasks.find((executionTask) => executionTask.taskId === taskId);

        if (execution === undefined) {
            response.status(404).send(`Execution "${taskId}" not found`);
            return;
        }

        response.send(execution.currentValue);
    });

    app.post<{
        pipelineUrl: string_pipeline_url /* TODO: callbackUrl: string_url */;
        inputParameters: InputParameters;
    }>(`${rootPath}/executions/new`, async (request, response) => {
        // <- TODO: !!!!!! What is the correct method

        try {
            const { inputParameters } = request.body;
            const pipelineUrl = request.body.pipelineUrl || request.body.book;

            // TODO: !!! Check `pipelineUrl` and `inputParameters`

            const pipeline = await collection?.getPipelineByUrl(pipelineUrl);
            // <- TODO: !!!!!! NotFoundError

            if (pipeline === undefined) {
                response.status(404).send(`Pipeline "${pipelineUrl}" not found`);
                return;
            }

            // TODO: !!!!!! Identify user here - use something common with `getExecutionToolsFromIdentification`
            const llm = await createLlmExecutionTools!({
                appId: '!!!!',
                userId: '!!!!',
                customOptions: {} as TODO_any,
            });

            // ------
            // TODO: !!!!!! Use something common with `getExecutionToolsFromIdentification`
            const fs = $provideFilesystemForNode();
            const executables = await $provideExecutablesForNode();
            const tools = {
                llm,
                fs,
                scrapers: await $provideScrapersForNode({ fs, llm, executables }),
                // TODO: Allow when `JavascriptExecutionTools` more secure *(without eval)*> script: [new JavascriptExecutionTools()],
            };
            // ------

            const pipelineExecutor = createPipelineExecutor({ pipeline, tools, ...options });

            const executionTask = pipelineExecutor(inputParameters);

            runningExecutionTasks.push(executionTask);

            response.send(executionTask);

            // TODO: !!!!!! Remove this:
            executionTask.asObservable().subscribe((_) => {
                console.log('!!!', _);
            });

            /*
            await fetch(request.body.callbackUrl);
            // <- TODO: !!!!!! Should be here transferred data as POST / PUT
            */
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            response.status(400).send({ error: serializeError(error) });
        }
    });

    const httpServer = http.createServer(app);

    const server: Server = new Server(httpServer, {
        path: socketioPath,
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

        const getExecutionToolsFromIdentification = async (
            identification: PromptbookServer_Identification<TCustomOptions>,
        ): Promise<ExecutionTools & { llm: LlmExecutionTools }> => {
            const { isAnonymous } = identification;

            if (isAnonymous === true && !isAnonymousModeAllowed) {
                throw new PipelineExecutionError(`Anonymous mode is not allowed`); // <- TODO: [main] !!3 Test
            }

            if (isAnonymous === false && !isApplicationModeAllowed) {
                throw new PipelineExecutionError(`Application mode is not allowed`); // <- TODO: [main] !!3 Test
            }

            // TODO: [main] !!4 Validate here userId (pass validator as dependency)

            let llm: LlmExecutionTools;

            if (isAnonymous === true) {
                // Note: Anonymouse mode
                // TODO: Maybe check that configuration is not empty
                const { llmToolsConfiguration } = identification;
                llm = createLlmToolsFromConfiguration(llmToolsConfiguration, { isVerbose });
            } else if (isAnonymous === false && createLlmExecutionTools !== null) {
                // Note: Application mode
                const { appId, userId, customOptions } = identification;
                llm = await createLlmExecutionTools!({
                    appId,
                    userId,
                    customOptions,
                });
            } else {
                throw new PipelineExecutionError(
                    `You must provide either llmToolsConfiguration or non-anonymous mode must be propperly configured`,
                );
            }

            const fs = $provideFilesystemForNode();
            const executables = await $provideExecutablesForNode();
            const tools = {
                llm,
                fs,
                scrapers: await $provideScrapersForNode({ fs, llm, executables }),
                // TODO: Allow when `JavascriptExecutionTools` more secure *(without eval)*> script: [new JavascriptExecutionTools()],
            };

            return tools;
        };

        // -----------

        socket.on('prompt-request', async (request: PromptbookServer_Prompt_Request<TCustomOptions>) => {
            const { identification, prompt } = request;

            if (isVerbose) {
                console.info(colors.bgWhite(`Prompt:`), colors.gray(JSON.stringify(request, null, 4)));
            }

            try {
                const executionTools = await getExecutionToolsFromIdentification(identification);
                const { llm } = executionTools;

                if (
                    identification.isAnonymous === false &&
                    collection !== null &&
                    !(await collection.isResponsibleForPrompt(prompt))
                ) {
                    throw new PipelineExecutionError(`Pipeline is not in the collection of this server`);
                }

                let promptResult: PromptResult;
                switch (prompt.modelRequirements.modelVariant) {
                    case 'CHAT':
                        if (llm.callChatModel === undefined) {
                            // Note: [0] This check should not be a thing
                            throw new PipelineExecutionError(`Chat model is not available`);
                        }
                        promptResult = await llm.callChatModel(prompt);
                        break;

                    case 'COMPLETION':
                        if (llm.callCompletionModel === undefined) {
                            // Note: [0] This check should not be a thing
                            throw new PipelineExecutionError(`Completion model is not available`);
                        }
                        promptResult = await llm.callCompletionModel(prompt);
                        break;

                    case 'EMBEDDING':
                        if (llm.callEmbeddingModel === undefined) {
                            // Note: [0] This check should not be a thing
                            throw new PipelineExecutionError(`Embedding model is not available`);
                        }
                        promptResult = await llm.callEmbeddingModel(prompt);
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
                    { promptResult } satisfies PromptbookServer_Prompt_Response /* <- Note: [🤛] */,
                );
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                socket.emit('error', serializeError(error) satisfies PromptbookServer_Error /* <- Note: [🤛] */);
            } finally {
                socket.disconnect();
                // TODO: [🍚]> executionTools.destroy();
            }
        });

        // -----------

        // TODO: [👒] Listing models (and checking configuration) probbably should go through REST API not Socket.io
        socket.on('listModels-request', async (request: PromptbookServer_ListModels_Request<TCustomOptions>) => {
            const { identification } = request;

            if (isVerbose) {
                console.info(colors.bgWhite(`Listing models`));
            }

            try {
                const executionTools = await getExecutionToolsFromIdentification(identification);
                const { llm } = executionTools;

                const models = await llm.listModels();

                socket.emit(
                    'listModels-response',
                    { models } satisfies PromptbookServer_ListModels_Response /* <- Note: [🤛] */,
                );
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                socket.emit('error', serializeError(error) satisfies PromptbookServer_Error);
            } finally {
                socket.disconnect();
                // TODO: [🍚]> executionTools.destroy();
            }
        });

        // -----------

        // TODO: [👒] Listing models (and checking configuration) probbably should go through REST API not Socket.io
        socket.on(
            'preparePipeline-request',
            async (request: PromptbookServer_PreparePipeline_Request<TCustomOptions>) => {
                const { identification, pipeline } = request;

                if (isVerbose) {
                    console.info(colors.bgWhite(`Prepare pipeline`));
                }

                try {
                    const executionTools = await getExecutionToolsFromIdentification(identification);

                    const preparedPipeline = await preparePipeline(pipeline, executionTools, options);

                    socket.emit(
                        'preparePipeline-response',
                        { preparedPipeline } satisfies PromptbookServer_PreparePipeline_Response /* <- Note: [🤛] */,
                    );
                } catch (error) {
                    if (!(error instanceof Error)) {
                        throw error;
                    }

                    socket.emit('error', serializeError(error) satisfies PromptbookServer_Error);
                    // <- TODO: [🚋] There is a problem with the remote server handling errors and sending them back to the client
                } finally {
                    socket.disconnect();
                    // TODO: [🍚]> executionTools.destroy();
                }
            },
        );

        // -----------

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
 * TODO: !!!!!!! CORS and security
 * TODO: !!!!!!! Allow to pass tokem here
 * TODO: [👩🏾‍🤝‍🧑🏾] Allow to pass custom fetch function here - PromptbookFetch
 * TODO: Split this file into multiple functions - handler for each request
 * TODO: Maybe use `$exportJson`
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 * TODO: [⚖] Expose the collection to be able to connect to same collection via createCollectionFromUrl
 * TODO: Handle progress - support streaming
 * TODO: [🗯] Do not hang up immediately but wait until client closes OR timeout
 * TODO: [🗯] Timeout on chat to free up resources
 * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
 * TODO: [0] Set unavailable models as undefined in `RemoteLlmExecutionTools` NOT throw error here
 * TODO: Allow to constrain anonymous mode for specific models / providers
 */
