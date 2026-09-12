import type { Command } from 'commander';
import type { $side_effect } from '../../utils/organization/$side_effect';

/**
 * Shape of the Commander internals which decide whether one command is listed among the subcommands in the help
 *
 * Note: Commander accepts hiding only while the command is being registered - `program.command(name, { hidden: true })`
 *       or `program.addCommand(command, { hidden: true })` - and exposes no setter for an already registered command,
 *       so the very same flag which both of them set is written here directly.
 *
 * @private internal type of `$hideCliCommandFromHelp`
 */
type CommandWithHiddenFlag = {
    _hidden: boolean;
};

/**
 * Keeps one already registered CLI command out of the help of its parent command while the command itself stays
 * fully usable - it can still be run, it still has its own help and it is still reachable through `ptbk help <command>`.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it changes how the CLI renders its help
 *
 * @private utility of CLI
 */
export function $hideCliCommandFromHelp(command: Command): $side_effect {
    (command as unknown as CommandWithHiddenFlag)._hidden = true;
}
