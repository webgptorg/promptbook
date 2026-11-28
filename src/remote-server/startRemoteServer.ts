import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import express from 'express';
import http from 'http';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { spaceTrim } from 'spacetrim';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { forTime } from 'waitasecond';
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
import { promptbookFetch } from '../scrapers/_common/utils/promptbookFetch';
import type { InputParameters } from '../types/typeAliases';
import type { string_pipeline_url } from '../types/typeAliases';
import { keepTypeImported } from '../utils/organization/keepTypeImported';
import type { really_any } from '../utils/organization/really_any';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { TODO_narrow } from '../utils/organization/TODO_narrow';
import { BOOK_LANGUAGE_VERSION } from '../version';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';
import type { RemoteServer } from './RemoteServer';
import type { PromptbookServer_Error } from './socket-types/_common/PromptbookServer_Error';
import type { Identification } from './socket-types/_subtypes/Identification';
import type { PromptbookServer_ListModels_Request } from './socket-types/listModels/PromptbookServer_ListModels_Request';
import type { PromptbookServer_ListModels_Response } from './socket-types/listModels/PromptbookServer_ListModels_Response';
import type { PromptbookServer_PreparePipeline_Request } from './socket-types/prepare/PromptbookServer_PreparePipeline_Request';
import type { PromptbookServer_PreparePipeline_Response } from './socket-types/prepare/PromptbookServer_PreparePipeline_Response';
import type { PromptbookServer_Prompt_Request } from './socket-types/prompt/PromptbookServer_Prompt_Request';
import type { PromptbookServer_Prompt_Response } from './socket-types/prompt/PromptbookServer_Prompt_Response';
import type { LoginResponse } from './types/RemoteServerOptions';
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
): RemoteServer {
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

    const app = express();

    app.use(express.json());
    app.use(function (request, response, next) {
        response.setHeader('X-Powered-By', 'Promptbook engine');
        next();
    });

    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'Promptbook Remote Server API',
                version: '1.0.0',
                description: 'API documentation for the Promptbook Remote Server',
            },
            /*
            TODO:
            servers: [
                {
                    url: `http://localhost:${port}${rootPath}`,
                    // <- TODO: Pass some public URLs here
                },
            ],
            */
        },
        apis: ['./src/remote-server/**/*.ts'], // Adjust path as needed
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    app.use(`/api-docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    const runningExecutionTasks: Array<ExecutionTask> = [];
    // <- TODO: [🤬] Identify the users

    // TODO: [🧠] Do here some garbage collection of finished tasks

    /**
     * @swagger
     * /:
     *   get:
     *     summary: Get server details
     *     description: Returns details about the Promptbook server.
     *     responses:
     *       200:
     *         description: Server details in markdown format.
     */
    app.get('/', async (request, response) => {
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
                        [
                            ...app._router.stack
                                .map(({ route }: really_any) => route?.path || null)
                                .filter((path: string) => path !== null),
                            '/api-docs',
                        ]
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

    /**
     * @swagger
     *
     * /login:
     *  post:
     *   summary: Login to the server
     *   description: Login to the server and get identification.
     *   requestBody:
     *    required: true
     *    content:
     *     application/json:
     *      schema:
     *       type: object
     *       properties:
     *        username:
     *         type: string
     *        password:
     *         type: string
     *        appId:
     *         type: string
     *   responses:
     *    200:
     *     description: Successful login
     *     content:
     *      application/json:
     *       schema:
     *        type: object
     *        properties:
     *         identification:
     *          type: object
     */
    app.post(`/login`, async (request, response) => {
        if (!isApplicationModeAllowed || login === null) {
            response.status(400).send('Application mode is not allowed');
            return;
        }

        try {
            const username = request.body.username;
            const password = request.body.password;
            const appId = request.body.appId;

            const { isSuccess, error, message, identification } = await login({
                username,
                password,
                appId,
                rawRequest: request,
                rawResponse: response,
            });
            response.status(201).send({
                isSuccess,
                message,
                error: error ? (serializeError(error) as TODO_any) : undefined,
                identification,
            } satisfies LoginResponse<really_any>);
            return;
        } catch (error) {
            assertsError(error);

            if (error instanceof AuthenticationError) {
                response.status(401).send({
                    isSuccess: false,
                    message: error.message,
                    error: serializeError(error) as TODO_any,
                } satisfies LoginResponse<really_any>);
            }

            console.warn(`Login function thrown different error than AuthenticationError`, {
                error,
                serializedError: serializeError(error),
            });
            response.status(400).send({ error: serializeError(error) });
        }
    });

    /**
     * @swagger
     * /books:
     *   get:
     *     summary: List all books
     *     description: Returns a list of all available books in the collection.
     *     responses:
     *       200:
     *         description: A list of books.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: string
     */
    app.get(`/books`, async (request, response) => {
        if (collection === null) {
            response.status(500).send('No collection available');
            return;
        }

        const pipelines = await collection.listPipelines();
        // <- TODO: [🧠][👩🏾‍🤝‍🧑🏿] List `inputParameters` required for the execution

        response.send(pipelines);
    });

    // TODO: [🧠] Is it secure / good idea to expose source codes of hosted books

    /**
     * @swagger
     * /books/{bookId}:
     *   get:
     *     summary: Get book content
     *     description: Returns the content of a specific book.
     *     parameters:
     *       - in: path
     *         name: bookId
     *         required: true
     *         schema:
     *           type: string
     *         description: The ID of the book to retrieve.
     *     responses:
     *       200:
     *         description: The content of the book.
     *         content:
     *           text/markdown:
     *             schema:
     *               type: string
     *       404:
     *         description: Book not found.
     */
    app.get(`/books/*`, async (request, response) => {
        try {
            if (collection === null) {
                response.status(500).send('No collection nor books available');
                return;
            }

            const pipelines = await collection.listPipelines();

            const fullUrl = request.protocol + '://' + request.get('host') + request.originalUrl;
            const pipelineUrl = pipelines.find((pipelineUrl) => pipelineUrl.endsWith(request.originalUrl)) || fullUrl;

            const pipeline = await collection.getPipelineByUrl(pipelineUrl);

            const source = pipeline.sources[0];

            if (source === undefined || source.type !== 'BOOK') {
                throw new Error('Pipeline source is not a book');
            }

            response
                .type(
                    'text/markdown',
                    // <- TODO: [🧠] Make custom mime-type for books
                )
                .send(source.content);
        } catch (error) {
            assertsError(error);

            response
                .status(
                    404,
                    // <- TODO: [👨🏼‍🤝‍👨🏻] Implement and use `errorToHttpStatus`
                )
                .send({ error: serializeError(error) });
        }
    });

    function exportExecutionTask(executionTask: ExecutionTask, isFull: boolean) {
        // <- TODO: [🧠] This should be maybe method of `ExecutionTask` itself
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

    /**
     * @swagger
     * /executions:
     *   get:
     *     summary: List all executions
     *     description: Returns a list of all running execution tasks.
     *     responses:
     *       200:
     *         description: A list of execution tasks.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     */
    app.get(`/executions`, async (request, response) => {
        response.send(
            runningExecutionTasks.map((runningExecutionTask) => exportExecutionTask(runningExecutionTask, false)),
            // <- TODO: [🧠][👩🏼‍🤝‍🧑🏼] Secure this through some token
            // <- TODO: [🧠] Better and more information
        );
    });

    app.get(`/executions/last`, async (request, response) => {
        // TODO: [🤬] Filter only for user

        if (runningExecutionTasks.length === 0) {
            response.status(404).send('No execution tasks found');
            return;
        }

        const lastExecutionTask = runningExecutionTasks[runningExecutionTasks.length - 1];
        response.send(exportExecutionTask(lastExecutionTask!, true));
    });

    app.get(`/executions/:taskId`, async (request, response) => {
        const { taskId } = request.params;

        // TODO: [🤬] Filter only for user
        const executionTask = runningExecutionTasks.find((executionTask) => executionTask.taskId === taskId);

        if (executionTask === undefined) {
            response
                .status(
                    404,
                    // <- TODO: [👨🏼‍🤝‍👨🏻] Implement and use `errorToHttpStatus`
                )
                .send(`Execution "${taskId}" not found`);
            return;
        }

        response.send(exportExecutionTask(executionTask, true));
    });

    /**
     * @swagger
     * /executions/new:
     *   post:
     *     summary: Start a new execution
     *     description: Starts a new execution task for a given pipeline.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               pipelineUrl:
     *                 type: string
     *               inputParameters:
     *                 type: object
     *               identification:
     *                 type: object
     *     responses:
     *       200:
     *         description: The newly created execution task.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *       400:
     *         description: Invalid input.
     */
    app.post<{
        pipelineUrl: string_pipeline_url /* TODO: callbackUrl: string_url */;
        inputParameters: InputParameters;
        identification: Identification<TCustomOptions>;
    }>(`/executions/new`, async (request, response) => {
        try {
            const { inputParameters, identification /* <- [🤬] */ } = request.body;
            const pipelineUrl = request.body.pipelineUrl || request.body.book;

            // TODO: [🧠] Check `pipelineUrl` and `inputParameters` here or it should be responsibility of `collection.getPipelineByUrl` and `pipelineExecutor`

            const pipeline = await collection?.getPipelineByUrl(pipelineUrl);

            if (pipeline === undefined) {
                response.status(404).send(`Pipeline "${pipelineUrl}" not found`);
                return;
            }

            const tools = await getExecutionToolsFromIdentification(identification);

            const pipelineExecutor = createPipelineExecutor({ pipeline, tools, ...options });

            const executionTask = pipelineExecutor(inputParameters);

            runningExecutionTasks.push(executionTask);

            await forTime(10);
            // <- Note: Wait for a while to wait for quick responses or sudden but asynchronous errors
            // <- TODO: Put this into configuration

            response.send(executionTask);

            /*/
            executionTask.asObservable().subscribe({
                next(partialResult) {
                    console.info(executionTask.taskId, 'next', partialResult);
                },
                error(error) {
                    console.info(executionTask.taskId, 'error', error);
                },
                complete() {
                    console.info(executionTask.taskId, 'complete');
                },
            });
            /**/

            /*
            await fetch(request.body.callbackUrl);
            // <- TODO: [🧠] Should be here transferred data as POST / PUT
            */
        } catch (error) {
            assertsError(error);

            response.status(400).send({ error: serializeError(error) });
        }
    });

    /**
     * Catch-all handler for unmatched routes
     */
    app.use((request, response) => {
        response.status(404).send(`URL "${request.originalUrl}" was not found on Promptbook server.`);
    });

    const httpServer = http.createServer(app);

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

        // -----------

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
                assertsError(error);

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
                const tools = await getExecutionToolsFromIdentification(identification);
                const { llm } = tools;

                const models = await llm.listModels();

                socket.emit(
                    'listModels-response',
                    { models } satisfies PromptbookServer_ListModels_Response /* <- Note: [🤛] */,
                );
            } catch (error) {
                assertsError(error);

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
                    const tools = await getExecutionToolsFromIdentification(identification);

                    const preparedPipeline = await preparePipeline(pipeline, tools, options);

                    socket.emit(
                        'preparePipeline-response',
                        { preparedPipeline } satisfies PromptbookServer_PreparePipeline_Response /* <- Note: [🤛] */,
                    );
                } catch (error) {
                    assertsError(error);

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
        get httpServer(): http.Server<TODO_any> {
            return httpServer;
        },

        get expressApp(): express.Express {
            return app;
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
            httpServer.close();
            server.close();
        },
    };
}

/**
 * TODO: [🌡] Add CORS and security - probbably via `helmet`
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
