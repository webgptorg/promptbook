import colors from 'colors';
import commander from 'commander';
import { spaceTrim } from 'spacetrim';
import { CLAIM } from '../config';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import { $isRunningInNode } from '../utils/environment/$isRunningInNode';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';
import { $initializeAboutCommand } from './cli-commands/about';
import { $initializeHelloCommand } from './cli-commands/hello';
import { $initializeListModelsCommand } from './cli-commands/list-models';
import { $initializeListScrapersCommand } from './cli-commands/list-scrapers';
import { $initializeMakeCommand } from './cli-commands/make';
import { $initializePrettifyCommand } from './cli-commands/prettify';
import { $initializeRunCommand } from './cli-commands/run';
import { $initializeStartServerCommand } from './cli-commands/start-server';
import { $initializeTestCommand } from './cli-commands/test-command';

/**
 * Runs CLI utilities of Promptbook package
 *
 * @private within the `@promptbook/cli`
 */
export async function promptbookCli(): Promise<void> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Function promptbookCli is initiator of CLI script and should be run in Node.js environment.

                - In browser use function exported from \`@promptbook/utils\` or  \`@promptbook/core\` directly, for example \`prettifyPipelineString\`.

            `),
        );
    }

    const isVerbose = process.argv.some((arg) => arg === '--verbose' || arg === '-v');
    //     <- TODO: Can be this be done with commander before the commander commands are initialized?
    if (isVerbose) {
        console.info(
            colors.gray(`Promptbook CLI version ${PROMPTBOOK_ENGINE_VERSION} in ${__filename.split('\\').join('/')}`),
        );
    }

    const program = new commander.Command();
    program.name('promptbook');
    program.alias('ptbk');

    program.version(PROMPTBOOK_ENGINE_VERSION);
    program.description(CLAIM);

    $initializeAboutCommand(program);
    $initializeRunCommand(program);
    $initializeHelloCommand(program);
    $initializeMakeCommand(program);
    $initializePrettifyCommand(program);
    $initializeTestCommand(program);
    $initializeListModelsCommand(program);
    $initializeListScrapersCommand(program);
    $initializeStartServerCommand(program);

    program.parse(process.argv);
}

/**
 * TODO: [🧠] Maybe `run` command the default, instead of `ptbk run ./foo.book` -> `ptbk ./foo.book`
 * TODO: [🥠] Do not export, its just for CLI script
 * TODO: [🕌] When more functionalities, rename
 * Note: 11:11
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
