import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { ModelCommand } from './ModelCommand';

/**
 * Parses the model command
 *
 * @see ./MODEL-README.md for more details
 * @private within the commands folder
 */
export const modelCommandParser: CommandParser<ModelCommand> = {
    /**
     * Name of the command
     */
    name: 'MODEL',

    /**
     * Aliases for the MODEL command
     */
    aliases: ['BP'],

    /**
     * Description of the MODEL command
     */
    description: `@@`,

    /**
     * Example usages of the MODEL command
     */
    examples: ['MODEL foo', 'MODEL bar', 'BP foo', 'BP bar'],

    /**
     * Parses the MODEL command
     */
    parse(input: CommandParserInput): ModelCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`MODEL command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`MODEL value can not contain brr`);
        }

        return {
            type: 'MODEL',
            value,
        } satisfies ModelCommand;
    },
};
