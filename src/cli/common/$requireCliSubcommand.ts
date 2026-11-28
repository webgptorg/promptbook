import colors from 'colors';
import type { Command } from 'commander';
import type { $side_effect } from '../../utils/organization/$side_effect';

/**
 * Message printed when one CLI command which only groups subcommands is run without picking any of them.
 *
 * @private internal constant of `$requireCliSubcommand`
 */
const MISSING_CLI_SUBCOMMAND_MESSAGE = 'Please specify a subcommand.';

/**
 * Makes one CLI command which only groups subcommands ask for a subcommand instead of doing anything on its own.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers an action in the CLI
 *
 * @private utility of CLI
 */
export function $requireCliSubcommand(command: Command): $side_effect {
    command.action(() => $reportMissingCliSubcommand(command));
}

/**
 * Asks for a subcommand of one CLI command, prints its help and exits the process.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it writes to the console and exits the process
 *
 * @private utility of CLI
 */
export function $reportMissingCliSubcommand(command: Command): never {
    console.info(colors.yellow(MISSING_CLI_SUBCOMMAND_MESSAGE));
    console.info('');

    return command.help();
}
