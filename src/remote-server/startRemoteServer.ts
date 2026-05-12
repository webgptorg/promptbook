import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import http from 'http';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { spaceTrim } from 'spacetrim';
import swaggerUi from 'swagger-ui-express';
import { forTime } from 'waitasecond';
import { CLAIM, DEFAULT_IS_VERBOSE } from '../config';
import { assertsError } from '../errors/assertsError';
import { AuthenticationError } from '../errors/AuthenticationError';
import { PipelineExecutionError } from '../errors/PipelineExecutionError';
import { serializeError } from '../errors/utils/serializeError';
import { $provideExecutablesForNode } from '../executables/$provideExecutablesForNode';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { AbstractTask, ExecutionTask } from '../execution/ExecutionTask';
import type { ExecutionTools } from '../execution/ExecutionTools';
import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import type { PromptResult } from '../execution/PromptResult';
import { createLlmToolsFromConfiguration } from '../llm-providers/_common/register/createLlmToolsFromConfiguration';
import { preparePipeline } from '../prepare/preparePipeline';
import { $provideFilesystemForNode } from '../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../scrapers/_common/register/$provideScrapersForNode';
import { $provideScriptingForNode } from '../scrapers/_common/register/$provideScriptingForNode';
import { promptbookFetch } from '../scrapers/_common/utils/promptbookFetch';
import type { Prompt } from '../types/Prompt';
import { keepTypeImported } from '../utils/organization/keepTypeImported';
import type { chococake } from '../utils/organization/really_any';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { TODO_narrow } from '../utils/organization/TODO_narrow';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';
import { openapiJson } from './openapi';
import type { paths } from './openapi-types';
import type { RemoteServer } from './RemoteServer';
import type { PromptbookServer_Error } from './socket-types/_common/PromptbookServer_Error';
import type { Identification } from './socket-types/_subtypes/Identification';
import type { PromptbookServer_ListModels_Request } from './socket-types/listModels/PromptbookServer_ListModels_Request';
import type { PromptbookServer_ListModels_Response } from './socket-types/listModels/PromptbookServer_ListModels_Response';
import type { PromptbookServer_PreparePipeline_Request } from './socket-types/prepare/PromptbookServer_PreparePipeline_Request';
import { PromptbookServer_PreparePipeline_Response } from './socket-types/prepare/PromptbookServer_PreparePipeline_Response';
import type { PromptbookServer_Prompt_Request } from './socket-types/prompt/PromptbookServer_Prompt_Request';
import type { PromptbookServer_Prompt_Response } from './socket-types/prompt/PromptbookServer_Prompt_Response';
import type { ApplicationRemoteServerOptions, LoginResponse, RemoteServerOptions } from './types/RemoteServerOptions';
import { renderServerIndexHtml } from './ui/renderServerIndexHtml';
import type { ServerInfo } from './ui/types';

keepTypeImported<PromptbookServer_Prompt_Response>(); // <- Note: [🤛]
keepTypeImported<PromptbookServer_Error>(); // <- Note: [🤛]
keepTypeImported<PromptbookServer_ListModels_Response>(); // <- Note: [🤛]

// TODO: !!! Deprecate

/**
 * Normalized configuration shared by remote-server helpers.
 */
type StartRemoteServerConfiguration<TCustomOptions> = {
    readonly port: RemoteServerOptions<TCustomOptions>['port'];
    readonly collection: ApplicationRemoteServerOptions<TCustomOptions>['collection'] | null;
    readonly createExecutionTools: RemoteServerOptions<TCustomOptions>['createExecutionTools'];
    readonly createLlmExecutionTools: ApplicationRemoteServerOptions<TCustomOptions>['createLlmExecutionTools'] | null;
    readonly isAnonymousModeAllowed: boolean;
    readonly isApplicationModeAllowed: boolean;
    readonly isRichUi: boolean | undefined;
    readonly isVerbose: boolean;
    readonly login: ApplicationRemoteServerOptions<TCustomOptions>['login'] | null;
    readonly startOptions: RemoteServerOptions<TCustomOptions>;
};

/**
 * Runtime state shared by HTTP and Socket.io handlers.
 */
type RemoteServerRuntime<TCustomOptions> = {
    readonly app: express.Express;
    readonly configuration: StartRemoteServerConfiguration<TCustomOptions>;
    readonly runningExecutionTasks: Array<ExecutionTask>;
    readonly startupDate: Date;
};

/**
 * Internal representation of a socket response payload.
 */
type SocketResponse<TPayload> = {
    readonly eventName: string;
    readonly payload: TPayload;
};

/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 *
 * @public exported from `@promptbook/remote-server`
 */
export function startRemoteServer<TCustomOptions = undefined>(
    options: RemoteServerOptions<TCustomOptions>,
): RemoteServer {
    const configuration = resolveStartRemoteServerConfiguration(options);
    const startupDate = new Date();
    const runningExecutionTasks: Array<ExecutionTask> = [];
    // <- TODO: [🤬] Identify the users

    // TODO: [🧠] Do here some garbage collection of finished tasks

    const app = createRemoteServerExpressApp();
    const runtime = {
        app,
        configuration,
        startupDate,
        runningExecutionTasks,
    } satisfies RemoteServerRuntime<TCustomOptions>;

    registerRemoteServerHttpRoutes(runtime);

    const httpServer = http.createServer(app);
    const server = createSocketServer(httpServer);

    registerRemoteServerSocketHandlers(runtime, server);
    startListening(httpServer, configuration);

    return createRemoteServerHandle(app, httpServer, server);
}

/**
 * Resolves option defaults once so the rest of the file can work with a single shape.
 */
function resolveStartRemoteServerConfiguration<TCustomOptions>(
    startOptions: RemoteServerOptions<TCustomOptions>,
): StartRemoteServerConfiguration<TCustomOptions> {
    const {
        port,
        collection,
        createLlmExecutionTools,
        createExecutionTools,
        isAnonymousModeAllowed,
        isApplicationModeAllowed,
        isRichUi,
        isVerbose = DEFAULT_IS_VERBOSE,
        login,
    } = {
        isAnonymousModeAllowed: false,
        isApplicationModeAllowed: false,
        collection: null,
        createLlmExecutionTools: null,
        login: null,
        ...startOptions,
    };

    return {
        port,
        collection,
        createExecutionTools,
        createLlmExecutionTools,
        isAnonymousModeAllowed,
        isApplicationModeAllowed,
        isRichUi,
        isVerbose,
        login,
        startOptions,
    };
}

/**
 * Creates the base express application with shared middleware.
 */
function createRemoteServerExpressApp(): express.Express {
    const app = express();

    app.use(express.json());
    app.use(addPoweredByHeader);

    return app;
}

/**
 * Adds Promptbook branding header to each HTTP response.
 */
function addPoweredByHeader(request: Request, response: Response, next: NextFunction): void {
    response.setHeader('X-Powered-By', 'Promptbook engine');
    next();
}

/**
 * Registers all HTTP middleware and routes in the original order.
 */
function registerRemoteServerHttpRoutes<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
    registerOpenAiCompatibleChatCompletionsRoute(runtime);

    // TODO: [🥺] Expose openapiJson to consumer and also allow to add new routes
    registerOpenApiRoutes(runtime.app);

    registerServerIndexRoute(runtime);
    registerLoginRoute(runtime);
    registerBookRoutes(runtime);
    registerExecutionRoutes(runtime);
    registerNotFoundRoute(runtime.app);
}

/**
 * Registers the OpenAI-compatible chat completions endpoint.
 */
function registerOpenAiCompatibleChatCompletionsRoute<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
): void {
    runtime.app.post('/v1/chat/completions', async (request, response) => {
        // TODO: [🧠][🦢] Make OpenAI  compatible more promptbook-native - make reverse adapter from LlmExecutionTools to OpenAI-compatible:

        try {
            const params = request.body as {
                model: string;
                messages: Array<{ role: string; content: string }>;
            };

            response.json(await createOpenAiCompatibleChatCompletionsResponse(runtime, params));
        } catch (error) {
            response.status(500).json(createOpenAiCompatibleErrorResponse(error));
        }
    });
}

/**
 * Executes a pipeline and converts its output to an OpenAI-compatible response shape.
 */
async function createOpenAiCompatibleChatCompletionsResponse<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    params: { model: string; messages: Array<{ role: string; content: string }> },
) {
    const { model, messages } = params;
    const prompt = renderOpenAiCompatiblePrompt(messages);

    if (runtime.configuration.collection === null) {
        throw new Error('No collection available');
    }

    const pipeline = await runtime.configuration.collection.getPipelineByUrl(model);
    const pipelineExecutor = createPipelineExecutor({
        pipeline,
        tools: await getExecutionToolsFromIdentification(runtime.configuration, {
            isAnonymous: true,
            llmToolsConfiguration: [],
        }),
    });

    const result = await pipelineExecutor({ prompt }).asPromise({ isCrashedOnError: true });

    if (!result.isSuccessful) {
        throw new Error(`Failed to execute book: ${result.errors.join(', ')}`);
    }

    return {
        id: 'chatcmpl-' + Math.random().toString(36).substring(2),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: result.outputParameters.response,
                },
                finish_reason: 'stop',
            },
        ],
        usage: {
            prompt_tokens: 0, // TODO: Implement token counting
            completion_tokens: 0,
            total_tokens: 0,
        },
    };
}

/**
 * Flattens OpenAI-compatible chat messages into the prompt expected by a pipeline.
 */
function renderOpenAiCompatiblePrompt(messages: Array<{ role: string; content: string }>): string {
    return messages.map((message) => `${message.role}: ${message.content}`).join('\n');
}

/**
 * Converts unexpected server errors to the OpenAI-compatible error shape.
 */
function createOpenAiCompatibleErrorResponse(error: unknown) {
    return {
        error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'server_error',
            code: 'internal_error',
        },
    };
}

/**
 * Registers OpenAPI validation, docs, and the raw specification route.
 */
function registerOpenApiRoutes(app: express.Express): void {
    app.use(
        OpenApiValidator.middleware({
            apiSpec: openapiJson as TODO_any,

            ignorePaths(path: string) {
                return path.startsWith('/api-docs') || path.startsWith('/swagger') || path.startsWith('/openapi');
            },
            validateRequests: true,
            validateResponses: true,
        }),
    );

    app.use(
        [`/api-docs`, `/swagger`],
        swaggerUi.serve,
        swaggerUi.setup(openapiJson, {
            // customCss: '.swagger-ui .topbar { display: none }',
            // customSiteTitle: 'BRJ API',
            // customfavIcon: 'https://brj.app/favicon.ico',
        }),
    );

    app.get(`/openapi`, (request, response) => {
        response.json(openapiJson);
    });
}

/**
 * Registers the server homepage route for both rich and markdown UIs.
 */
function registerServerIndexRoute<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
    runtime.app.get('/', async (request, response) => {
        if (request.url?.includes('socket.io')) {
            return;
        }

        if (runtime.configuration.isRichUi !== false) {
            response.type('text/html').send(renderServerIndexHtml(await createServerInfo(runtime)));
            return;
        }

        response.type('text/markdown').send(
            await renderMarkdownServerIndex(runtime),
            // <- TODO: [🕋] Use here `aboutPromptbookInformation`
            // <- TODO: [🗽] Unite branding and make single place for it
        );
    });
}

/**
 * Creates the homepage data structure used by the rich server UI.
 */
async function createServerInfo<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): Promise<ServerInfo> {
    return {
        bookLanguageVersion: BOOK_LANGUAGE_VERSION,
        promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
        nodeVersion: process.version,
        port: runtime.configuration.port,
        startupDate: runtime.startupDate.toISOString(),
        isAnonymousModeAllowed: runtime.configuration.isAnonymousModeAllowed,
        isApplicationModeAllowed: runtime.configuration.isApplicationModeAllowed,
        pipelines: await listServerPipelines(runtime.configuration),
        runningExecutions: runtime.runningExecutionTasks.length,
        paths: listRegisteredPaths(runtime.app),
    };
}

/**
 * Lists collection pipelines only when the server is allowed to expose them.
 */
async function listServerPipelines<TCustomOptions>(
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
): Promise<ReadonlyArray<string>> {
    if (!configuration.isApplicationModeAllowed || configuration.collection === null) {
        return [];
    }

    return await configuration.collection.listPipelines();
}

/**
 * Lists route paths displayed on the server homepage.
 */
function listRegisteredPaths(app: express.Express): ReadonlyArray<string> {
    return [
        ...app._router.stack.map(({ route }: chococake) => route?.path || null).filter((path: string) => path !== null),
        '/api-docs',
    ];
}

/**
 * Renders the legacy markdown homepage with the same information as the rich UI.
 */
async function renderMarkdownServerIndex<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
): Promise<string> {
    const serverInfo = await createServerInfo(runtime);

    return await spaceTrim(
        async (block) => `
            # Promptbook

            > ${block(CLAIM)}

            **Book language version:** ${serverInfo.bookLanguageVersion}
            **Promptbook engine version:** ${serverInfo.promptbookEngineVersion}
            **Node.js version:** ${serverInfo.nodeVersion /* <- TODO: [🧠] Is it secure to expose this */}

            ---

            ## Details

            **Server port:** ${serverInfo.port}
            **Startup date:** ${serverInfo.startupDate}
            **Anonymous mode:** ${serverInfo.isAnonymousModeAllowed ? 'enabled' : 'disabled'}
            **Application mode:** ${serverInfo.isApplicationModeAllowed ? 'enabled' : 'disabled'}
            ${block(
                !runtime.configuration.isApplicationModeAllowed || runtime.configuration.collection === null
                    ? ''
                    : spaceTrim(
                          (nestedBlock) => `
                              **Pipelines in collection:**
                              ${nestedBlock(serverInfo.pipelines.map((pipelineUrl) => `- ${pipelineUrl}`).join('\n'))}
                          `,
                      ),
            )}
            **Running executions:** ${serverInfo.runningExecutions}

            ---

            ## Paths

            ${block(serverInfo.paths.map((path) => `- ${path}`).join('\n'))}

            ---

            ## Instructions

            To connect to this server use:

            1) The client https://www.npmjs.com/package/@promptbook/remote-client
            2) OpenAI compatible client *(Not working yet)*
            3) REST API

            For more information look at:
            https://github.com/webgptorg/promptbook
        `,
    );
}

/**
 * Registers the application-mode login endpoint.
 */
function registerLoginRoute<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
    runtime.app.post(`/login`, async (request, response) => {
        if (!runtime.configuration.isApplicationModeAllowed || runtime.configuration.login === null) {
            response.status(400).send('Application mode is not allowed');
            return;
        }

        try {
            const username = request.body.username;
            const password = request.body.password;
            const appId = request.body.appId;

            const { isSuccess, error, message, identification } = await runtime.configuration.login({
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
            } satisfies LoginResponse<chococake>);
            return;
        } catch (error) {
            assertsError(error);

            if (error instanceof AuthenticationError) {
                response.status(401).send({
                    isSuccess: false,
                    message: error.message,
                    error: serializeError(error) as TODO_any,
                } satisfies LoginResponse<chococake>);
            }

            console.warn(`Login function thrown different error than AuthenticationError`, {
                error,
                serializedError: serializeError(error),
            });
            response.status(400).send({ error: serializeError(error) });
        }
    });
}

/**
 * Registers book listing and book source download routes.
 */
function registerBookRoutes<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
    runtime.app.get(`/books`, async (request, response) => {
        if (runtime.configuration.collection === null) {
            response.status(500).send('No collection available');
            return;
        }

        const pipelines = await runtime.configuration.collection.listPipelines();
        // <- TODO: [🧠][👩🏾‍🤝‍🧑🏿] List `inputParameters` required for the execution

        response.send(pipelines satisfies paths['/books']['get']['responses']['200']['content']['application/json']);
    });

    // TODO: [🧠] Is it secure / good idea to expose source codes of hosted books

    runtime.app.get(`/books/*`, async (request, response) => {
        try {
            if (runtime.configuration.collection === null) {
                response.status(500).send('No collection nor books available');
                return;
            }

            const pipelines = await runtime.configuration.collection.listPipelines();
            const pipelineUrl = resolveBookPipelineUrl(request, pipelines);
            const pipeline = await runtime.configuration.collection.getPipelineByUrl(pipelineUrl);
            const source = pipeline.sources[0];

            if (source === undefined || source.type !== 'BOOK') {
                throw new Error('Pipeline source is not a book');
            }

            response
                .type(
                    'text/markdown',
                    // <- TODO: [🧠] Make custom mime-type for books
                )
                .send(
                    source.content as paths[`/books/{bookId}`]['get']['responses']['200']['content']['text/markdown'],
                );
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
}

/**
 * Resolves the requested book URL using either known collection URLs or the full request URL.
 */
function resolveBookPipelineUrl(request: Request, pipelines: ReadonlyArray<string>): string {
    const fullUrl = request.protocol + '://' + request.get('host') + request.originalUrl;
    return pipelines.find((pipelineUrl) => pipelineUrl.endsWith(request.originalUrl)) || fullUrl;
}

/**
 * Registers execution task listing, detail, and creation routes.
 */
function registerExecutionRoutes<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
    runtime.app.get(`/executions`, async (request, response) => {
        response.send(
            runtime.runningExecutionTasks.map((runningExecutionTask) =>
                exportExecutionTask(runningExecutionTask, false),
            ),
            /* <- TODO: satisfies paths['/executions']['get']['responses']['200']['content']['application/json'] */
            // <- TODO: [🧠][👩🏼‍🤝‍🧑🏼] Secure this through some token
            // <- TODO: [🧠] Better and more information
        );
    });

    runtime.app.get(`/executions/last`, async (request, response) => {
        // TODO: [🤬] Filter only for user

        if (runtime.runningExecutionTasks.length === 0) {
            response.status(404).send('No execution tasks found');
            return;
        }

        const lastExecutionTask = runtime.runningExecutionTasks[runtime.runningExecutionTasks.length - 1];
        response.send(exportExecutionTask(lastExecutionTask!, true));
    });

    runtime.app.get(`/executions/:taskId`, async (request, response) => {
        const { taskId } = request.params;

        // TODO: [🤬] Filter only for user
        const executionTask = runtime.runningExecutionTasks.find(
            (runningExecutionTask) => runningExecutionTask.taskId === taskId,
        );

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

    runtime.app.post(`/executions/new`, async (request, response) => {
        try {
            const { inputParameters, identification /* <- [🤬] */ } = request.body;
            const pipelineUrl =
                request.body
                    .pipelineUrl /* <- TODO: as paths['/executions/new']['post']['requestBody']['content']['application/json'] */ ||
                request.body.book;

            // TODO: [🧠] Check `pipelineUrl` and `inputParameters` here or it should be responsibility of `collection.getPipelineByUrl` and `pipelineExecutor`

            const pipeline = await runtime.configuration.collection?.getPipelineByUrl(pipelineUrl);

            if (pipeline === undefined) {
                response.status(404).send(`Pipeline "${pipelineUrl}" not found`);
                return;
            }

            const tools = await getExecutionToolsFromIdentification(runtime.configuration, identification);
            const pipelineExecutor = createPipelineExecutor({ pipeline, tools, ...runtime.configuration.startOptions });
            const executionTask = pipelineExecutor(inputParameters);

            runtime.runningExecutionTasks.push(executionTask);

            await forTime(10);
            // <- Note: Wait for a while to wait for quick responses or sudden but asynchronous errors
            // <- TODO: Put this into configuration

            response.send(
                executionTask /* <- TODO: satisfies paths['/executions/new']['post']['responses']['200']['content']['application/json'] */,
            );

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
}

/**
 * Converts an execution task to either summary or detailed API payload.
 */
function exportExecutionTask(executionTask: ExecutionTask, isDetailed: boolean) {
    // <- TODO: [🧠] This should be maybe method of `ExecutionTask` itself
    const {
        taskType,
        promptbookVersion,
        taskId,
        title,
        status,
        errors,
        tldr,
        warnings,
        createdAt,
        updatedAt,
        currentValue,
        llmCalls,
    } = executionTask;

    if (isDetailed) {
        return {
            taskId,
            title,
            taskType,
            promptbookVersion,
            status,
            tldr,
            errors: errors.map(serializeError),
            warnings: warnings.map(serializeError),
            llmCalls,
            createdAt,
            updatedAt,
            currentValue,
            ptbkNonce: 0,
        } satisfies Omit<AbstractTask<chococake>, 'asPromise' | 'asObservable'>;
    }

    return {
        taskId,
        title,
        taskType,
        promptbookVersion,
        status,
        tldr,
        createdAt,
        updatedAt,
        llmCalls,
        ptbkNonce: 0,
    } satisfies Omit<AbstractTask<chococake>, 'asPromise' | 'asObservable' | 'currentValue' | 'errors' | 'warnings'>;
}

/**
 * Registers the catch-all 404 handler.
 */
function registerNotFoundRoute(app: express.Express): void {
    /**
     * Catch-all handler for unmatched routes
     */
    app.use((request, response) => {
        response.status(404).send(`URL "${request.originalUrl}" was not found on Promptbook server.`);
    });
}

/**
 * Builds execution tools for a single incoming identification.
 */
async function getExecutionToolsFromIdentification<TCustomOptions>(
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
    identification: Identification<TCustomOptions> | null | undefined,
): Promise<ExecutionTools & { llm: LlmExecutionTools }> {
    assertIdentificationProvided(identification);
    assertIdentificationModeAllowed(configuration, identification);

    const llm = await createLlmExecutionToolsForIdentification(configuration, identification);
    const customExecutionTools = await createCustomExecutionTools(configuration, identification);

    return await resolveExecutionTools(customExecutionTools, llm);
}

/**
 * Ensures that a request contains identification before resolving tools.
 */
function assertIdentificationProvided<TCustomOptions>(
    identification: Identification<TCustomOptions> | null | undefined,
): asserts identification is Identification<TCustomOptions> {
    if (identification === null || identification === undefined) {
        throw new Error(`Identification is not provided`);
    }
}

/**
 * Verifies that the requested remote-server mode is enabled.
 */
function assertIdentificationModeAllowed<TCustomOptions>(
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
    identification: Identification<TCustomOptions>,
): void {
    if (identification.isAnonymous === true && !configuration.isAnonymousModeAllowed) {
        throw new PipelineExecutionError(`Anonymous mode is not allowed`); // <- TODO: [main] !!3 Test
    }

    if (identification.isAnonymous === false && !configuration.isApplicationModeAllowed) {
        throw new PipelineExecutionError(`Application mode is not allowed`); // <- TODO: [main] !!3 Test
    }

    // TODO: [main] !!4 Validate here userId (pass validator as dependency)
}

/**
 * Creates LLM tools according to the selected anonymous or application mode.
 */
async function createLlmExecutionToolsForIdentification<TCustomOptions>(
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
    identification: Identification<TCustomOptions>,
): Promise<LlmExecutionTools> {
    if (identification.isAnonymous === true) {
        const { userId, llmToolsConfiguration } = identification;

        return createLlmToolsFromConfiguration(llmToolsConfiguration, {
            title: `LLM Tools for anonymous user "${userId}" on server`,
            isVerbose: configuration.isVerbose,
        });
    }

    if (configuration.createLlmExecutionTools !== null) {
        return await configuration.createLlmExecutionTools(identification);
    }

    throw new PipelineExecutionError(
        `You must provide either llmToolsConfiguration or non-anonymous mode must be properly configured`,
    );
}

/**
 * Loads caller-provided custom execution tools, if any.
 */
async function createCustomExecutionTools<TCustomOptions>(
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
    identification: Identification<TCustomOptions>,
): Promise<Partial<Omit<ExecutionTools, 'llm'>>> {
    return configuration.createExecutionTools ? await configuration.createExecutionTools(identification) : {};
}

/**
 * Fills missing execution tools with the standard Node.js defaults.
 */
async function resolveExecutionTools(
    customExecutionTools: Partial<Omit<ExecutionTools, 'llm'>>,
    llm: LlmExecutionTools,
): Promise<ExecutionTools & { llm: LlmExecutionTools }> {
    const fs = customExecutionTools.fs || $provideFilesystemForNode();
    const executables = customExecutionTools.executables || (await $provideExecutablesForNode());
    const scrapers = customExecutionTools.scrapers || (await $provideScrapersForNode({ fs, llm, executables }));
    const script = customExecutionTools.script || (await $provideScriptingForNode({}));
    const fetch = customExecutionTools.fetch || promptbookFetch;
    const userInterface = customExecutionTools.userInterface || undefined;

    return {
        llm,
        fs,
        scrapers,
        script,
        fetch,
        userInterface,
    } satisfies ExecutionTools;
}

/**
 * Creates the Socket.io server with the existing transport and CORS settings.
 */
function createSocketServer(httpServer: http.Server): Server {
    return new Server(httpServer, {
        path: '/socket.io',
        transports: ['polling', 'websocket' /*, <- TODO: [🌬] Allow to pass `transports`, add 'webtransport' */],
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            // <- TODO: [🌡] Allow to pass
        },
    });
}

/**
 * Registers socket connection lifecycle handlers and per-event request handlers.
 */
function registerRemoteServerSocketHandlers<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    server: Server,
): void {
    server.on('connection', (socket: Socket) => {
        if (runtime.configuration.isVerbose) {
            console.info(colors.gray(`Client connected`), socket.id);
        }

        registerPromptSocketHandler(runtime, socket);
        registerListModelsSocketHandler(runtime, socket);
        registerPreparePipelineSocketHandler(runtime, socket);

        socket.on('disconnect', () => {
            // TODO: Destroy here executionToolsForClient
            if (runtime.configuration.isVerbose) {
                console.info(colors.gray(`Client disconnected`), socket.id);
            }
        });
    });
}

/**
 * Registers the socket prompt execution request handler.
 */
function registerPromptSocketHandler<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    socket: Socket,
): void {
    socket.on('prompt-request', async (request: PromptbookServer_Prompt_Request<TCustomOptions>) => {
        if (runtime.configuration.isVerbose) {
            console.info(colors.bgWhite(`Prompt:`), colors.gray(JSON.stringify(request, null, 4)));
        }

        await respondToSocketRequest(socket, async () => createPromptSocketResponse(runtime, request));
    });
}

/**
 * Creates the socket response for prompt execution.
 */
async function createPromptSocketResponse<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    request: PromptbookServer_Prompt_Request<TCustomOptions>,
): Promise<SocketResponse<PromptbookServer_Prompt_Response>> {
    const promptResult = await executePromptRequest(runtime, request);

    if (runtime.configuration.isVerbose) {
        console.info(colors.bgGreen(`PromptResult:`), colors.green(JSON.stringify(promptResult, null, 4)));
    }

    return {
        eventName: 'prompt-response',
        payload: { promptResult } satisfies PromptbookServer_Prompt_Response /* <- Note: [🤛] */,
    };
}

/**
 * Executes a prompt request after collection authorization checks.
 */
async function executePromptRequest<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    request: PromptbookServer_Prompt_Request<TCustomOptions>,
): Promise<PromptResult> {
    const { identification, prompt } = request;
    const tools = await getExecutionToolsFromIdentification(runtime.configuration, identification);

    if (
        identification.isAnonymous === false &&
        runtime.configuration.collection !== null &&
        !(await runtime.configuration.collection.isResponsibleForPrompt(prompt))
    ) {
        throw new PipelineExecutionError(`Pipeline is not in the collection of this server`);
    }

    return await executePromptWithLlm(tools.llm, prompt);
}

/**
 * Dispatches a prompt to the matching LLM method for its model variant.
 */
async function executePromptWithLlm(llm: LlmExecutionTools, prompt: Prompt): Promise<PromptResult> {
    switch (prompt.modelRequirements.modelVariant) {
        case 'CHAT':
            if (llm.callChatModel === undefined) {
                // Note: [0] This check should not be a thing
                throw new PipelineExecutionError(`Chat model is not available`);
            }
            return await llm.callChatModel(prompt);

        case 'COMPLETION':
            if (llm.callCompletionModel === undefined) {
                // Note: [0] This check should not be a thing
                throw new PipelineExecutionError(`Completion model is not available`);
            }
            return await llm.callCompletionModel(prompt);

        case 'EMBEDDING':
            if (llm.callEmbeddingModel === undefined) {
                // Note: [0] This check should not be a thing
                throw new PipelineExecutionError(`Embedding model is not available`);
            }
            return await llm.callEmbeddingModel(prompt);

        // <- case [🤖]:

        default:
            throw new PipelineExecutionError(
                `Unknown model variant "${(prompt as chococake).modelRequirements.modelVariant}"`,
            );
    }
}

/**
 * Registers the socket list-models request handler.
 */
function registerListModelsSocketHandler<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    socket: Socket,
): void {
    // TODO: [👒] Listing models (and checking configuration) probably should go through REST API not Socket.io
    socket.on('listModels-request', async (request: PromptbookServer_ListModels_Request<TCustomOptions>) => {
        if (runtime.configuration.isVerbose) {
            console.info(colors.bgWhite(`Listing models`));
        }

        await respondToSocketRequest(socket, async () => createListModelsSocketResponse(runtime, request));
    });
}

/**
 * Creates the socket response for listing available models.
 */
async function createListModelsSocketResponse<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    request: PromptbookServer_ListModels_Request<TCustomOptions>,
): Promise<SocketResponse<PromptbookServer_ListModels_Response>> {
    const tools = await getExecutionToolsFromIdentification(runtime.configuration, request.identification);
    const models = await tools.llm.listModels();

    return {
        eventName: 'listModels-response',
        payload: { models } satisfies PromptbookServer_ListModels_Response /* <- Note: [🤛] */,
    };
}

/**
 * Registers the socket prepare-pipeline request handler.
 */
function registerPreparePipelineSocketHandler<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    socket: Socket,
): void {
    // TODO: [👒] Listing models (and checking configuration) probably should go through REST API not Socket.io
    socket.on('preparePipeline-request', async (request: PromptbookServer_PreparePipeline_Request<TCustomOptions>) => {
        if (runtime.configuration.isVerbose) {
            console.info(colors.bgWhite(`Prepare pipeline`));
        }

        await respondToSocketRequest(socket, async () => createPreparePipelineSocketResponse(runtime, request));
    });
}

/**
 * Creates the socket response for preparePipeline.
 */
async function createPreparePipelineSocketResponse<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    request: PromptbookServer_PreparePipeline_Request<TCustomOptions>,
): Promise<SocketResponse<PromptbookServer_PreparePipeline_Response>> {
    const tools = await getExecutionToolsFromIdentification(runtime.configuration, request.identification);
    const preparedPipeline = await preparePipeline(request.pipeline, tools, runtime.configuration.startOptions);

    return {
        eventName: 'preparePipeline-response',
        payload: { preparedPipeline } satisfies PromptbookServer_PreparePipeline_Response /* <- Note: [🤛] */,
    };
}

/**
 * Executes one socket request and guarantees consistent error emission and cleanup.
 */
async function respondToSocketRequest<TPayload>(
    socket: Socket,
    createResponse: () => Promise<SocketResponse<TPayload>>,
): Promise<void> {
    try {
        const { eventName, payload } = await createResponse();
        socket.emit(eventName, payload);
    } catch (error) {
        assertsError(error);

        socket.emit('error', serializeError(error) satisfies PromptbookServer_Error /* <- Note: [🤛] */);
    } finally {
        socket.disconnect();
        // TODO: [🍚]> executionTools.destroy();
    }
}

/**
 * Starts the HTTP server and prints the startup diagnostics.
 */
function startListening<TCustomOptions>(
    httpServer: http.Server,
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
): void {
    httpServer.listen(configuration.port);

    // Note: We want to log this also in non-verbose mode
    console.info(colors.bgGreen(`PROMPTBOOK server listening on port ${configuration.port}`));
    if (configuration.isVerbose) {
        console.info(colors.gray(`Verbose mode is enabled`));
    }
}

/**
 * Creates the public RemoteServer handle with lazily exposed internals.
 */
function createRemoteServerHandle(app: express.Express, httpServer: http.Server, server: Server): RemoteServer {
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

// Note: [🟢] Code for Node server bootstrap [startRemoteServer](src/remote-server/startRemoteServer.ts) should never be published into packages that could be imported into browser environment
// TODO: [🕋] Use here `aboutPromptbookInformation`
// TODO: [🌡] Add CORS and security - probably via `helmet`
// TODO: Maybe use `$exportJson`
// TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
// TODO: [⚖] Expose the collection to be able to connect to same collection via createPipelineCollectionFromUrl
// TODO: Handle progress - support streaming
// TODO: [🗯] Do not hang up immediately but wait until client closes OR timeout
// TODO: [🗯] Timeout on chat to free up resources
// TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
// TODO: [0] Set unavailable models as undefined in `RemoteLlmExecutionTools` NOT throw error here
// TODO: Allow to constrain anonymous mode for specific models / providers
