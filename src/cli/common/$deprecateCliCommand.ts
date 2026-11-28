import colors from 'colors';
import { Command } from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { $hideCliCommandFromHelp } from './$hideCliCommandFromHelp';

/**
 * Marks one CLI command as deprecated while keeping it available for existing callers.
 *
 * Deprecated commands are not advertised anymore - they are hidden from the list of commands in the help of their
 * parent command, they warn when they are used and they explain the deprecation in their own help.
 *
 * @private utility of CLI
 */
export function $deprecateCliCommand(command: Command, deprecationMessage: string): $side_effect {
    command.description(
        spaceTrim(
            (block) => `
                ${block(command.description())}

                Deprecated: ${block(deprecationMessage)}
            `,
        ),
    );
    command.hook('preAction', () => {
        console.warn(colors.yellow(createDeprecatedCliCommandWarning(command, deprecationMessage)));
    });
    $hideCliCommandFromHelp(command);
}

/**
 * Creates the runtime warning printed before a deprecated CLI command action starts.
 */
function createDeprecatedCliCommandWarning(command: Command, deprecationMessage: string): string {
    return `Warning: \`ptbk ${command.name()}\` is deprecated. ${deprecationMessage}`;
}
