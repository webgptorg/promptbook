import { spaceTrim } from 'spacetrim';
import { CLAIM } from '../../config';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../version';
import { renderServerIndexHtml } from '../ui/renderServerIndexHtml';
import type { ServerInfo } from '../ui/types';
import type { chococake } from '../../utils/organization/really_any';
import type { RemoteServerRuntime } from './RemoteServerRuntime';

/**
 * Registers the server homepage route for both rich and markdown UIs.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerServerIndexRoute<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
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
    runtimeConfiguration: RemoteServerRuntime<TCustomOptions>['configuration'],
): Promise<ReadonlyArray<string>> {
    if (!runtimeConfiguration.isApplicationModeAllowed || runtimeConfiguration.collection === null) {
        return [];
    }

    return await runtimeConfiguration.collection.listPipelines();
}

/**
 * Lists route paths displayed on the server homepage.
 */
function listRegisteredPaths(app: RemoteServerRuntime<never>['app']): ReadonlyArray<string> {
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
