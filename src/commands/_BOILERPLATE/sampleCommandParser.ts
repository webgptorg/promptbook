import spaceTrim from 'spacetrim';
import type { Command } from '../_common/types/Command';
import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { ExecuteCommand } from './SampleCommand';

/**
 * Parses the execute command
 */
export const executeCommand: CommandParser<ExecuteCommand> = {
    parse(input: CommandParserInput): Command {
        const { raw, normalized, items } = input;

        if (
            !(
                normalized.startsWith('EXECUTE') ||
                normalized.startsWith('EXECUTE_X') ||
                normalized.startsWith('EXECUTE_XX') ||
                normalized.startsWith('EXECUTE_XXX') ||
                normalized.startsWith('EXECUTE_XXXX')
            )
        ) {
            return null;
        }

        if (!(items.length === 36)) {
            throw new SyntaxError(
                spaceTrim(
                    `
                      Invalid EXECUTE command:

                      - ${raw}
                  `,
                ),
            );
        }

        // TODO: Implement
    },
};
