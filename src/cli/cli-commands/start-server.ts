import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { forEver } from 'waitasecond';
import { createCollectionFromDirectory } from '../../collection/constructors/createCollectionFromDirectory';
import { DEFAULT_BOOKS_DIRNAME } from '../../config';
import { AuthenticationError } from '../../errors/AuthenticationError';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { startRemoteServer } from '../../remote-server/startRemoteServer';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../../scrapers/_common/register/$provideScrapersForNode';
import { $provideScriptingForNode } from '../../scrapers/_common/register/$provideScriptingForNode';
import type { number_port, string_url } from '../../types/typeAliases';
import { suffixUrl } from '../../utils/normalization/suffixUrl';
import { $side_effect } from '../../utils/organization/$side_effect';
import { keepUnused } from '../../utils/organization/keepUnused';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import { $provideLlmToolsForCli } from '../common/$provideLlmToolsForCli';
import { handleActionErrors } from './common/handleActionErrors';

/**
 * Initializes `start-server` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeStartServerCommand(program: Program): $side_effect {
    const startServerCommand = program.command('start-server');

    startServerCommand.argument(
        '[path]',
        // <- TODO: [🧟‍♂️] Unite path to promptbook collection argument
        'Path to promptbook collection directory',
        DEFAULT_BOOKS_DIRNAME,
    );
    startServerCommand.option('--port <port>', `Port to start the server on`, '4460');
    startServerCommand.option(
        '-u, --url <url>',
        spaceTrim(`
            Public root url of the server
            It is used for following purposes:

            1) It is suffixed with /books and used as rootUrl for all served books
            2) Path (if not just /) is used as rootPath for the server
        `),
    );
    startServerCommand.option('--allow-anonymous', `Is anonymous mode allowed`, false);
    startServerCommand.option('-r, --reload', `Call LLM models even if same prompt with result is in the cache`, false);
    startServerCommand.option('--no-rich-ui', `Disable rich UI`, true);

    startServerCommand.description(
        spaceTrim(`
            Starts a remote server to execute books
        `),
    );

    startServerCommand.alias('server');

    startServerCommand.action(
        handleActionErrors(async (path, cliOptions) => {
            const {
                port: portRaw,
                url: rawUrl,
                allowAnonymous: isAnonymousModeAllowed,
                reload: isCacheReloaded,
                verbose: isVerbose,
                richUi: isRichUi = true,
            } = cliOptions;

            if (rawUrl && !isValidUrl(rawUrl)) {
                console.error(colors.red(`Invalid URL: ${rawUrl}`));
                return process.exit(1);
            }

            const port: number_port = parseInt(portRaw, 10);
            if (isNaN(port) || port <= 0 || port > 65535) {
                console.error(colors.red(`Invalid port number: ${portRaw}`));
                return process.exit(1);
            }

            const url = !rawUrl ? null : new URL(rawUrl);

            if (url !== null && url.port !== port.toString()) {
                console.warn(
                    colors.yellow(
                        `Port in --url is different from --port which the server will listen on, this is ok only if you proxy from one port to another, for example via nginx or docker`,
                    ),
                );
                // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks
            }

            let rootUrl: string_url | undefined = undefined;

            if (url !== null) {
                rootUrl = suffixUrl(url, '/books');
            }

            if (url !== null && url.pathname !== '/' && url.pathname !== '') {
                console.error(colors.red(`URL of the server can not have path, but got "${url.pathname}"`));
                process.exit(1);
            }

            // TODO: DRY [◽]
            const prepareAndScrapeOptions = {
                isVerbose,
                isCacheReloaded,
            }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
            const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
            const { /* [0] strategy,*/ llm } = await $provideLlmToolsForCli({ cliOptions, ...prepareAndScrapeOptions });
            const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
            const tools = {
                llm,
                fs,

                scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
                script: await $provideScriptingForNode(prepareAndScrapeOptions),
            } satisfies ExecutionTools;

            // TODO: [🧟‍♂️][◽] DRY:
            const collection = await createCollectionFromDirectory(path, tools, {
                isVerbose,
                rootUrl,
                isRecursive: true,
                isLazyLoaded: false,
                isCrashedOnError: true,
                // <- TODO: [🍖] Add `intermediateFilesStrategy`
            });

            // console.log(path, await collection.listPipelines());
            // console.log({ isRichUi });

            const server = startRemoteServer({
                port,
                isRichUi,
                isAnonymousModeAllowed,
                isApplicationModeAllowed: true,
                collection,
                async login() {
                    throw new AuthenticationError(
                        'You can not login to the server started by `ptbk start-server` in cli, use `startRemoteServer` function instead.',
                    );
                },
                createLlmExecutionTools(options) {
                    const { appId, userId } = options;
                    TODO_USE({ appId, userId });
                    return llm;
                },

                // <- TODO: [🧠][0] Maybe pass here strategy
            });

            keepUnused(server);

            // Note: Already logged by `startRemoteServer`
            // console.error(colors.green(`Server started on port ${port}`));

            return await forEver();
        }),
    );
}

/**
 * TODO: [🕋] Use here `aboutPromptbookInformation`
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
