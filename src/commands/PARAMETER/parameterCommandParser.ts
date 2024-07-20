import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { ParameterCommand } from './ParameterCommand';

/**
 * Parses the parameter command
 *
 * @see ./PARAMETER-README.md for more details
 * @private within the commands folder
 */
export const parameterCommandParser: CommandParser<ParameterCommand> = {
    /**
     * Name of the command
     */
    name: 'PARAMETER',

    /**
     * Aliases for the PARAMETER command
     */
    aliases: ['BP'],

    /**
     * Description of the PARAMETER command
     */
    description: `@@`,

    /**
     * Example usages of the PARAMETER command
     */
    examples: ['PARAMETER foo', 'PARAMETER bar', 'BP foo', 'BP bar'],

    /**
     * Parses the PARAMETER command
     */
    parse(input: CommandParserInput): ParameterCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`PARAMETER command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`PARAMETER value can not contain brr`);
        }

        return {
            type: 'PARAMETER',
            value,
        } satisfies ParameterCommand;
    },
};
