import colors from 'colors';
import { Command } from 'commander';
import type { $side_effect } from '../../utils/organization/$side_effect';

/**
 * Marks one CLI command as deprecated while keeping it available for existing callers.
 *
 * @private utility of CLI
 */
export function $deprecateCliCommand(command: Command, deprecationMessage: string): $side_effect {
    command.description(`${command.description()}\n\nDeprecated: ${deprecationMessage}`);
    command.hook('preAction', () => {
        console.warn(colors.yellow(createDeprecatedCliCommandWarning(command, deprecationMessage)));
    });
}

/**
 * Creates the runtime warning printed before a deprecated CLI command action starts.
 */
function createDeprecatedCliCommandWarning(command: Command, deprecationMessage: string): string {
    return `Warning: \`ptbk ${command.name()}\` is deprecated. ${deprecationMessage}`;
}
