import type { Command } from '../_common/types/Command';
import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { BoilerplateCommand } from './BoilerplateCommand';

/**
 * Parses the boilerplate command
 *
 * @see ./BOILERPLATE-README.md for more details
 * @private within the commands folder
 */
export const boilerplateCommandParser: CommandParser<BoilerplateCommand> = {
    /**
     * Name of the command
     */
    name: 'BOILERPLATE',

    /**
     * Aliases for the BOILERPLATE command
     */
    aliases: ['BP'],

    /**
     * Description of the BOILERPLATE command
     */
    description: `Boilerplate uses as showcase for creating new commands. It is a simple command that does nothing but print a message.`,

    /**
     * Example usages of the BOILERPLATE command
     */
    examples: ['BOILERPLATE foo', 'BOILERPLATE bar', 'BP foo', 'BP bar'],

    /**
     * Parses the BOILERPLATE command
     */
    parse(input: CommandParserInput): Command {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`BOILERPLATE command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`BOILERPLATE value can not contain brr`);
        }

        return {
            type: 'BOILERPLATE',
            value,
        };
    },
};
