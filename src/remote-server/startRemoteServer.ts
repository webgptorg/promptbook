import http from 'http';
import type { ExecutionTask } from '../execution/ExecutionTask';
import { keepTypeImported } from '../utils/organization/keepTypeImported';
import type { RemoteServer } from './RemoteServer';
import type { PromptbookServer_ListModels_Response } from './socket-types/listModels/PromptbookServer_ListModels_Response';
import type { PromptbookServer_Prompt_Response } from './socket-types/prompt/PromptbookServer_Prompt_Response';
import type { PromptbookServer_Error } from './socket-types/_common/PromptbookServer_Error';
import type { RemoteServerOptions } from './types/RemoteServerOptions';
import { createRemoteServerExpressApp } from './startRemoteServer/createRemoteServerExpressApp';
import { createRemoteServerHandle } from './startRemoteServer/createRemoteServerHandle';
import { createSocketServer } from './startRemoteServer/createSocketServer';
import type { RemoteServerRuntime } from './startRemoteServer/RemoteServerRuntime';
import { registerRemoteServerHttpRoutes } from './startRemoteServer/registerRemoteServerHttpRoutes';
import { registerRemoteServerSocketHandlers } from './startRemoteServer/registerRemoteServerSocketHandlers';
import { resolveStartRemoteServerConfiguration } from './startRemoteServer/resolveStartRemoteServerConfiguration';
import { startListening } from './startRemoteServer/startListening';

keepTypeImported<PromptbookServer_Prompt_Response>(); // <- Note: [🤛]
keepTypeImported<PromptbookServer_Error>(); // <- Note: [🤛]
keepTypeImported<PromptbookServer_ListModels_Response>(); // <- Note: [🤛]

// TODO: !!! Deprecate

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
