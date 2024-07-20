import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { JokerCommand } from './JokerCommand';

/**
 * Parses the joker command
 *
 * @see ./JOKER-README.md for more details
 * @private within the commands folder
 */
export const jokerCommandParser: CommandParser<JokerCommand> = {
    /**
     * Name of the command
     */
    name: 'JOKER',

    /**
     * Aliases for the JOKER command
     */
    aliases: ['BP'],

    /**
     * Description of the JOKER command
     */
    description: `@@`,

    /**
     * Example usages of the JOKER command
     */
    examples: ['JOKER foo', 'JOKER bar', 'BP foo', 'BP bar'],

    /**
     * Parses the JOKER command
     */
    parse(input: CommandParserInput): JokerCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`JOKER command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`JOKER value can not contain brr`);
        }

        return {
            type: 'JOKER',
            value,
        } satisfies JokerCommand;
    },
};
