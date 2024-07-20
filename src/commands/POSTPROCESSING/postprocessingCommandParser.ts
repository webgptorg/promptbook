import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { PostprocessingCommand } from './PostprocessingCommand';

/**
 * Parses the postprocessing command
 *
 * @see ./POSTPROCESSING-README.md for more details
 * @private within the commands folder
 */
export const postprocessingCommandParser: CommandParser<PostprocessingCommand> = {
    /**
     * Name of the command
     */
    name: 'POSTPROCESSING',

    /**
     * Aliases for the POSTPROCESSING command
     */
    aliases: ['BP'],

    /**
     * Description of the POSTPROCESSING command
     */
    description: `@@`,

    /**
     * Example usages of the POSTPROCESSING command
     */
    examples: ['POSTPROCESSING foo', 'POSTPROCESSING bar', 'BP foo', 'BP bar'],

    /**
     * Parses the POSTPROCESSING command
     */
    parse(input: CommandParserInput): PostprocessingCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`POSTPROCESSING command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`POSTPROCESSING value can not contain brr`);
        }

        return {
            type: 'POSTPROCESSING',
            value,
        } satisfies PostprocessingCommand;
    },
};
