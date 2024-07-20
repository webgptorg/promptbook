import spaceTrim from 'spacetrim';
import type { Command } from '../_common/types/Command';
import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import documentation from './BOILERPLATE-README.md';
import { BoilerplateCommand } from './BoilerplateCommand';

/**
 * Parses the boilerplate command
 *
 * @see ./BOILERPLATE-README.md for more details
 */
export const boilerplateCommandParser: CommandParser<BoilerplateCommand> = {
    documentation,

    parse(input: CommandParserInput): Command {
        const { raw, normalized, args } = input;

        if (
            !(
                normalized.startsWith('BOILERPLATE') ||
                normalized.startsWith('BOILERPLATE_X') ||
                normalized.startsWith('BOILERPLATE_XX') ||
                normalized.startsWith('BOILERPLATE_XXX') ||
                normalized.startsWith('BOILERPLATE_XXXX')
            )
        ) {
            return null;
        }

        if (args.length !== 1) {
            throw new SyntaxError(
                spaceTrim(
                    (block) => `
                        BOILERPLATE command requires exactly one argument:

                        Your command:
                        - ${raw}

                        Documentation:
                        ${block(documentation)}
                    `,
                ),
            );
        }

        return {
            type: 'BOILERPLATE',
            value: args[0],
        };
    },
};
