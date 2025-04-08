import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
import { CLAIM, DEFAULT_IS_VERBOSE } from '../config';
import { CLAIM } from '../config';
import { DEFAULT_IS_VERBOSE } from '../config';
import { assertsError } from '../errors/assertsError';
import { AuthenticationError } from '../errors/AuthenticationError';
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
import { $provideScriptingForNode } from '../scrapers/_common/register/$provideScriptingForNode';
import type { InputParameters, string_pipeline_url } from '../types/typeAliases';
import { promptbookFetch } from '../scrapers/_common/utils/promptbookFetch';
import type { InputParameters } from '../types/typeAliases';
import type { string_pipeline_url } from '../types/typeAliases';
import { keepTypeImported } from '../utils/organization/keepTypeImported';
import type { really_any } from '../utils/organization/really_any';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { TODO_narrow } from '../utils/organization/TODO_narrow';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';
import type { RemoteServer } from './RemoteServer';
import type { PromptbookServer_Error } from './socket-types/_common/PromptbookServer_Error';
import type { Identification } from './socket-types/_subtypes/Identification';
import type { PromptbookServer_ListModels_Request } from './socket-types/listModels/PromptbookServer_ListModels_Request';
import type { PromptbookServer_ListModels_Response } from './socket-types/listModels/PromptbookServer_ListModels_Response';
import type { PromptbookServer_PreparePipeline_Request } from './socket-types/prepare/PromptbookServer_PreparePipeline_Request';
import type { PromptbookServer_PreparePipeline_Response } from './socket-types/prepare/PromptbookServer_PreparePipeline_Response';
import type { PromptbookServer_Prompt_Request } from './socket-types/prompt/PromptbookServer_Prompt_Request';
import type { PromptbookServer_Prompt_Response } from './socket-types/prompt/PromptbookServer_Prompt_Response';
import type { LoginResponse, RemoteServerOptions } from './types/RemoteServerOptions';

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
export async function startRemoteServer<TCustomOptions = undefined>(
    options: RemoteServerOptions<TCustomOptions>,
): Promise<RemoteServer> /* <- TODO: [🧠] Should be this function async or not */ {
    const {
        port,
        collection,
        createLlmExecutionTools,
        createExecutionTools,
        isAnonymousModeAllowed,
        isApplicationModeAllowed,
        isVerbose = DEFAULT_IS_VERBOSE,
        login,
    } = {
        isAnonymousModeAllowed: false,
        isApplicationModeAllowed: false,
        collection: null,
        createLlmExecutionTools: null,
        login: null,
        ...options,
    };

    const startupDate = new Date();

    async function getExecutionToolsFromIdentification(
        identification: Identification<TCustomOptions>,
    ): Promise<ExecutionTools & { llm: LlmExecutionTools }> {
        if (identification === null || identification === undefined) {
            throw new Error(`Identification is not provided`);
        }

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
                isAnonymous: false,
                appId,
                userId,
                customOptions,
            });
        } else {
            throw new PipelineExecutionError(
                `You must provide either llmToolsConfiguration or non-anonymous mode must be propperly configured`,
            );
        }

        const customExecutionTools = createExecutionTools ? await createExecutionTools(identification) : {};

        const fs = customExecutionTools.fs || $provideFilesystemForNode();
        const executables = customExecutionTools.executables || (await $provideExecutablesForNode());
        const scrapers = customExecutionTools.scrapers || (await $provideScrapersForNode({ fs, llm, executables }));
        const script = customExecutionTools.script || (await $provideScriptingForNode({}));
        const fetch = customExecutionTools.fetch || promptbookFetch;
        const userInterface = customExecutionTools.userInterface || undefined;

        const tools = {
            llm,
            fs,
            scrapers,
            script,
            fetch,
            userInterface,
        } satisfies ExecutionTools;

        return tools;
    }

    const app = new Elysia()
        .use(
            swagger({
                documentation: {
                    info: {
                        title: 'Promptbook Remote Server API',
                        version: '1.0.0',
                        description: 'API documentation for the Promptbook Remote Server',
                    },
                    servers: [
                        {
                            url: `http://localhost:${port}${rootPath}`,
                            // <- TODO: !!!!! Probbably: Pass `remoteServerUrl` instead of `port` and `rootPath`
                        },
                    ],
                },
            }),
        )
        .decorate('startupDate', startupDate)
        .decorate('runningExecutionTasks', [] as Array<ExecutionTask>)
        .derive(({ request }: TODO_any /* <- TODO: !!! */) => ({
            fullUrl: request.url,
        }));

    // Add headers middleware
    app.derive({ as: 'global' }, ({ set }: TODO_any /* <- TODO: !!! */) => {
        set.headers['X-Powered-By'] = 'Promptbook engine';
        return {};
    });


    const runningExecutionTasks: Array<ExecutionTask> = [];

    function exportExecutionTask(executionTask: ExecutionTask, isFull: boolean) {
        const { taskType, taskId, status, errors, warnings, createdAt, updatedAt, currentValue } = executionTask;

        if (isFull) {
            return {
                nonce: '✨',
                taskId,
                taskType,
                status,
                errors: errors.map(serializeError),
                warnings: warnings.map(serializeError),
                createdAt,
                updatedAt,
                currentValue,
            };
        } else {
            return {
                nonce: '✨',
                taskId,
                taskType,
                status,
                createdAt,
                updatedAt,
            };
        }
    }

    // Root endpoint
    app.get('/', async ({ startupDate }) => {
        return new Response(
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
                        app.routes
                            .map((route: TODO_any /* <- TODO: !!! */) => `- ${route.path}`)
                            .concat('/api-docs')
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
            {
                headers: {
                    'Content-Type': 'text/markdown',
                },
            },
        );
    });

    // Login endpoint
    app.post(( '/login', async ({ body, request, set }) => {
        if (!isApplicationModeAllowed || login === null) {
            set.status = 400;
            return 'Application mode is not allowed';
        }

        try {
            const { username, password, appId } = body as {
                username: string;
                password: string;
                appId: string;
            };

            const { isSuccess, error, message, identification } = await login({
                username,
                password,
                appId,
                rawRequest: request,
                rawResponse: set,
            });

            set.status = 201;
            return {
                isSuccess,
                message,
                error: error ? (serializeError(error) as TODO_any) : undefined,
                identification,
            } satisfies LoginResponse<really_any>;
        } catch (error) {
            assertsError(error);

            if (error instanceof AuthenticationError) {
                set.status = 401;
                return {
                    isSuccess: false,
                    message: error.message,
                    error: serializeError(error) as TODO_any,
                } satisfies LoginResponse<really_any>;
            }

            console.warn(`Login function thrown different error than AuthenticationError`, {
                error,
                serializedError: serializeError(error),
            });

            set.status = 400;
            return { error: serializeError(error) };
        }
    });

    // Books listing endpoint
    app.get( '/books', async ({ set }) => {
        if (collection === null) {
            set.status = 500;
            return 'No collection available';
        }

        const pipelines = await collection.listPipelines();
        return pipelines;
    });

    // Get book content endpoint
    app.get( '/books/*', async ({ request, fullUrl, set }) => {
        try {
            if (collection === null) {
                set.status = 500;
                return 'No collection nor books available';
            }

            const pipelines = await collection.listPipelines();
            const path = new URL(request.url).pathname;
            const pipelineUrl = pipelines.find((url) => url.endsWith(path)) || fullUrl;

            const pipeline = await collection.getPipelineByUrl(pipelineUrl);
            const source = pipeline.sources[0];

            if (source === undefined || source.type !== 'BOOK') {
                throw new Error('Pipeline source is not a book');
            }

            return new Response(source.content, {
                headers: {
                    'Content-Type': 'text/markdown',
                },
            });
        } catch (error) {
            assertsError(error);

            set.status = 404;
            return { error: serializeError(error) };
        }
    });

    // Executions listing endpoint
    app.get( '/executions', () => {
        return runningExecutionTasks.map((task) => exportExecutionTask(task, false));
    });

    // Last execution endpoint
    app.get('/executions/last', ({ set }) => {
        if (runningExecutionTasks.length === 0) {
            set.status = 404;
            return 'No execution tasks found';
        }

        const lastExecutionTask = runningExecutionTasks[runningExecutionTasks.length - 1];
        return exportExecutionTask(lastExecutionTask!, true);
    });

    // Get execution by ID endpoint
    app.get( '/executions/:taskId', ({ params, set }) => {
        const { taskId } = params;
        const executionTask = runningExecutionTasks.find((task) => task.taskId === taskId);

        if (executionTask === undefined) {
            set.status = 404;
            return `Execution "${taskId}" not found`;
        }

        return exportExecutionTask(executionTask, true);
    });

    // Start new execution endpoint
    app.post( '/executions/new', async ({ body, set }) => {
        try {
            const { inputParameters, identification } = body as {
                inputParameters: InputParameters;
                identification: Identification<TCustomOptions>;
                pipelineUrl?: string_pipeline_url;
                book?: string_pipeline_url;
            };
            const pipelineUrl = body.pipelineUrl || body.book;

            const pipeline = await collection?.getPipelineByUrl(pipelineUrl);

            if (pipeline === undefined) {
                set.status = 404;
                return `Pipeline "${pipelineUrl}" not found`;
            }

            const tools = await getExecutionToolsFromIdentification(identification);
            const pipelineExecutor = createPipelineExecutor({ pipeline, tools, ...options });
            const executionTask = pipelineExecutor(inputParameters);

            runningExecutionTasks.push(executionTask);

            await forTime(10);

            return executionTask;
        } catch (error) {
            assertsError(error);

            set.status = 400;
            return { error: serializeError(error) };
        }
    });

    // Create HTTP server from Elysia
    const httpServer = app.listen({ port });

    // Setup Socket.io on the HTTP server
    const server: Server = new Server(httpServer, {
        path: '/socket.io',
        transports: ['polling', 'websocket' /*, <- TODO: [🌬] Allow to pass `transports`, add 'webtransport' */],
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            // <- TODO: [🌡] Allow to pass
        },
    });

    server.on('connection', (socket: Socket) => {
        if (isVerbose) {
            console.info(colors.gray(`Client connected`), socket.id);
        }

        socket.on('prompt-request', async (request: PromptbookServer_Prompt_Request<TCustomOptions>) => {
            const { identification, prompt } = request;

            if (isVerbose) {
                console.info(colors.bgWhite(`Prompt:`), colors.gray(JSON.stringify(request, null, 4)));
            }

            try {
                const tools = await getExecutionToolsFromIdentification(identification);
                const { llm } = tools;

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
                            throw new PipelineExecutionError(`Chat model is not available`);
                        }
                        promptResult = await llm.callChatModel(prompt);
                        break;

                    case 'COMPLETION':
                        if (llm.callCompletionModel === undefined) {
                            throw new PipelineExecutionError(`Completion model is not available`);
                        }
                        promptResult = await llm.callCompletionModel(prompt);
                        break;

                    case 'EMBEDDING':
                        if (llm.callEmbeddingModel === undefined) {
                            throw new PipelineExecutionError(`Embedding model is not available`);
                        }
                        promptResult = await llm.callEmbeddingModel(prompt);
                        break;

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
                assertsError(error);

                socket.emit('error', serializeError(error) satisfies PromptbookServer_Error);
            } finally {
                socket.disconnect();
            }
        });

        socket.on('listModels-request', async (request: PromptbookServer_ListModels_Request<TCustomOptions>) => {
            const { identification } = request;

            if (isVerbose) {
                console.info(colors.bgWhite(`Listing models`));
            }

            try {
                const tools = await getExecutionToolsFromIdentification(identification);
                const { llm } = tools;

                const models = await llm.listModels();

                socket.emit('listModels-response', { models } satisfies PromptbookServer_ListModels_Response);
            } catch (error) {
                assertsError(error);

                socket.emit('error', serializeError(error) satisfies PromptbookServer_Error);
            } finally {
                socket.disconnect();
            }
        });

        socket.on(
            'preparePipeline-request',
            async (request: PromptbookServer_PreparePipeline_Request<TCustomOptions>) => {
                const { identification, pipeline } = request;

                if (isVerbose) {
                    console.info(colors.bgWhite(`Prepare pipeline`));
                }

                try {
                    const tools = await getExecutionToolsFromIdentification(identification);

                    const preparedPipeline = await preparePipeline(pipeline, tools, options);

                    socket.emit('preparePipeline-response', {
                        preparedPipeline,
                    } satisfies PromptbookServer_PreparePipeline_Response);
                } catch (error) {
                    assertsError(error);

                    socket.emit('error', serializeError(error) satisfies PromptbookServer_Error);
                } finally {
                    socket.disconnect();
                }
            },
        );

        socket.on('disconnect', () => {
            if (isVerbose) {
                console.info(colors.gray(`Client disconnected`), socket.id);
            }
        });
    });

    console.info(colors.bgGreen(`PROMPTBOOK server listening on port ${port}`));
    if (isVerbose) {
        console.info(colors.gray(`Verbose mode is enabled`));
    }

    let isDestroyed = false;

    return {
        /*
        TODO: [🧠][🚟] Should be this exposed
        import http from 'http';
        get httpServer(): http.Server<TODO_any> {
            return httpServer;
        },
        */

        get elisiaApp() /* : typeof Elysia */ {
            return app as TODO_any;
        },

        get socketIoServer(): Server<
            TODO_narrow<DefaultEventsMap>,
            TODO_narrow<DefaultEventsMap>,
            TODO_narrow<DefaultEventsMap>,
            TODO_any
        > {
            return server;
        },

        get isDestroyed() {
            return isDestroyed;
        },
        destroy() {
            if (isDestroyed) {
                return;
            }
            isDestroyed = true;
            server.close();
            app.stop();
        },
    } satisfies RemoteServer;
}

/**
 * TODO: !!!! Should be this async or not
 * TODO: [🌡] Add CORS and security - probbably via `helmet` or Elysia's built-in security plugins
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
