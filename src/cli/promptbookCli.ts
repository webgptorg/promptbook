import colors from 'colors';
import commander from 'commander';
import { spaceTrim } from 'spacetrim';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import { $isRunningInNode } from '../utils/environment/$isRunningInNode';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';
import { $initializePromptbookCliProgram } from './$initializePromptbookCliProgram';
import { $reportMissingCliSubcommand } from './common/$requireCliSubcommand';

/**
 * Raw top-level CLI arguments that print the Promptbook version.
 *
 * @private internal constant of `promptbookCli`
 */
const VERSION_OPTION_ARGUMENTS: ReadonlySet<string> = new Set(['-v', '--version']);

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

    const commandLineArguments = process.argv.slice(2);
    const isVersionRequested = isTopLevelVersionRequested(commandLineArguments);

    if (isVersionRequested) {
        console.info(PROMPTBOOK_ENGINE_VERSION);
        return process.exit(0);
    }

    const isVerbose = commandLineArguments.some((argument) => argument === '--verbose' || argument === '-v');
    //     <- TODO: Can be this be done with commander before the commander commands are initialized?
    if (isVerbose) {
        console.info(
            colors.gray(`Promptbook CLI version ${PROMPTBOOK_ENGINE_VERSION} in ${__filename.split('\\').join('/')}`),
        );
    }

    const program = new commander.Command();
    $initializePromptbookCliProgram(program);

    // Note: There is no default command, so `ptbk` without a subcommand asks for one
    //       instead of running the deprecated `ptbk run`
    if (commandLineArguments.length === 0) {
        return $reportMissingCliSubcommand(program);
    }

    program.parse(process.argv);
}

/**
 * Checks whether the invocation asks for the root Promptbook CLI version.
 *
 * @private internal utility of `promptbookCli`
 */
function isTopLevelVersionRequested(commandLineArguments: ReadonlyArray<string>): boolean {
    const firstCommandLineArgument = commandLineArguments[0];

    return firstCommandLineArgument !== undefined && VERSION_OPTION_ARGUMENTS.has(firstCommandLineArgument);
}

// Note: [🟡] Code for CLI program [promptbookCli](src/cli/promptbookCli.ts) should never be published outside of `@promptbook/cli`
// TODO: [🥠] Do not export, its just for CLI script
// TODO: [🕌] When more functionalities, rename
// Note: 11:11
