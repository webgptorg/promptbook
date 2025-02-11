import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { createCollectionFromDirectory } from '../../collection/constructors/createCollectionFromDirectory';
import { DEFAULT_BOOKS_DIRNAME } from '../../config';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { $provideLlmToolsForWizzardOrCli } from '../../llm-providers/_common/register/$provideLlmToolsForWizzardOrCli';
import { startRemoteServer } from '../../remote-server/startRemoteServer';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import type { number_port } from '../../types/typeAliases';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { keepUnused } from '../../utils/organization/keepUnused';

/**
 * Initializes `start-server` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeStartServerCommand(program: Program) {
    const startServerCommand = program.command('start-server');

    startServerCommand.argument(
        '[path]',
        // <- TODO: [🧟‍♂️] Unite path to promptbook collection argument
        'Path to promptbook collection directory',
        DEFAULT_BOOKS_DIRNAME,
    );
    startServerCommand.option('--port <port>', `Port to start the server on`, '4460');
    startServerCommand.option('--allow-anonymous', `Is anonymous mode allowed`, false);
    startServerCommand.option('-r, --reload', `Call LLM models even if same prompt with result is in the cache`, false);
    startServerCommand.option('-v, --verbose', `Is output verbose`, false);

    startServerCommand.description(
        spaceTrim(`
            Starts a remote server to execute books
        `),
    );

    startServerCommand.action(
        async (path, { port, allowAnonymous: isAnonymousModeAllowed, reload: isCacheReloaded, verbose: isVerbose }) => {
            // console.log('startServerCommand.action', { port, isAnonymousModeAllowed, isCacheReloaded, isVerbose });

            // TODO: DRY [◽]
            const prepareAndScrapeOptions = {
                isVerbose,
                isCacheReloaded,
            }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
            const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
            const llm = await $provideLlmToolsForWizzardOrCli(prepareAndScrapeOptions);
            const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
            const tools = {
                llm,
                fs,

                scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
                script: [
                    /*new JavascriptExecutionTools(options)*/
                ],
            } satisfies ExecutionTools;

            // TODO: [🧟‍♂️][◽] DRY:
            const collection = await createCollectionFromDirectory(path, tools, {
                isVerbose,
                // TODO: [🧠] Utilize implicit urls for books
                // rootUrl: `http://localhost:${port}/books`,
                isRecursive: true,
                isLazyLoaded: false,
                isCrashedOnError: true,
                // <- TODO: [🍖] Add `intermediateFilesStrategy`
            });

            const server = startRemoteServer({
                rootPath: '/',
                port: parseInt(port, 10) as number_port,
                isAnonymousModeAllowed,
                isApplicationModeAllowed: true,
                collection,
                createLlmExecutionTools(options) {
                    const { appId, userId } = options;
                    TODO_USE({ appId, userId });
                    return llm;
                },
            });

            keepUnused(server);

            // Note: Already logged by `startRemoteServer`
            // console.error(colors.green(`Server started on port ${port}`));
        },
    );
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
