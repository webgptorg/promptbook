import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { ExpectCommand } from './ExpectCommand';

/**
 * Parses the expect command
 *
 * @see ./EXPECT-README.md for more details
 * @private within the commands folder
 */
export const expectCommandParser: CommandParser<ExpectCommand> = {
    /**
     * Name of the command
     */
    name: 'EXPECT',

    /**
     * Aliases for the EXPECT command
     */
    aliases: ['BP'],

    /**
     * Description of the EXPECT command
     */
    description: `@@`,

    /**
     * Example usages of the EXPECT command
     */
    examples: ['EXPECT foo', 'EXPECT bar', 'BP foo', 'BP bar'],

    /**
     * Parses the EXPECT command
     */
    parse(input: CommandParserInput): ExpectCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`EXPECT command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`EXPECT value can not contain brr`);
        }

        return {
            type: 'EXPECT',
            value,
        } satisfies ExpectCommand;
    },
};
