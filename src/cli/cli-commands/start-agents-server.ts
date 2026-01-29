import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { DEFAULT_AGENTS_DIRNAME } from '../../config';
import { NETWORK_LIMITS } from '../../constants';
import { startAgentServer } from '../../remote-server/startAgentServer';
import type { number_port } from '../../types/typeAliases';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { handleActionErrors } from './common/handleActionErrors';

/**
 * Initializes `start-agents-server` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeStartAgentsServerCommand(program: Program): $side_effect {
    const startServerCommand = program.command('start-agents-server');

    startServerCommand.argument(
        '[path]',
        // <- TODO: [🧟‍♂️] Unite path to promptbook collection argument
        'Path to agents directory',
        DEFAULT_AGENTS_DIRNAME,
    );
    startServerCommand.option('--port <port>', `Port to start the server on`, '4440');
    startServerCommand.option('-r, --reload', `Call LLM models even if same prompt with result is in the cache`, false);

    startServerCommand.description(
        spaceTrim(`
            Starts a Promptbook agents server
        `),
    );

    startServerCommand.alias('start');

    startServerCommand.action(
        handleActionErrors(async (path, cliOptions) => {
            const { port: portRaw, reload: isCacheReloaded, verbose: isVerbose } = cliOptions;

            // TODO: [🐱‍🚀] [🌕] DRY

            const port: number_port = parseInt(portRaw, 10);
            if (isNaN(port) || port <= 0 || port > NETWORK_LIMITS.MAX_PORT) {
                console.error(colors.red(`Invalid port number: ${portRaw}`));
                return process.exit(1);
            }

            TODO_USE(path);
            TODO_USE(isCacheReloaded);
            TODO_USE(isVerbose);

            /*

            // TODO: DRY [◽]
            const prepareAndScrapeOptions = {
                isVerbose,
                isCacheReloaded,
            }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` * /
            const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
            const { /* [0] strategy,* / llm } = await $provideLlmToolsForCli({ cliOptions, ...prepareAndScrapeOptions });
            const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
            const tools = {
                llm,
                fs,
                executables,
                scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
                script: await $provideScriptingForNode(prepareAndScrapeOptions),
            } satisfies ExecutionTools;

            // TODO: [🧟‍♂️][◽] DRY:
            const collection = new AgentCollectionInDirectory(path, tools, {
                isVerbose,
                isRecursive: true,
                isLazyLoaded: false,
                isCrashedOnError: true,
                // <- TODO: [🍖] Add `intermediateFilesStrategy`
            });

            // console.log(path, await collection.listAgents());
            // console.log({ isRichUi });

            TODO_USE(tools);
            TODO_USE(collection);
            */

            // TODO: [🐱‍🚀] Use

            // TODO: [🐱‍🚀] Pass collection and tools to the server starter
            // TODO: [🐱‍🚀] The Next app should be build during the package build step not here

            /*
            // TODO: [🐱‍🚀] Run this conditionally only in production mode in dev mode use `next dev`
            await $execCommand({
                cwd: './apps/agents-server',
                command: `next build`,
                isVerbose: true,
            });

            await $execCommand({
                cwd: './apps/agents-server',
                command: `next start --port ${port} `,
                isVerbose: true,
            });
            */

            await startAgentServer({ port });
        }),
    );
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
