import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { SampleCommand } from './SampleCommand';

/**
 * Parses the sample command
 *
 * @see ./SAMPLE-README.md for more details
 * @private within the commands folder
 */
export const sampleCommandParser: CommandParser<SampleCommand> = {
    /**
     * Name of the command
     */
    name: 'SAMPLE',


    /**
     * Description of the SAMPLE command
     */
    description: `@@`,

    /**
     * Example usages of the SAMPLE command
     */
    examples: ['SAMPLE foo', 'SAMPLE bar', 'BP foo', 'BP bar'],

    /**
     * Parses the SAMPLE command
     */
    parse(input: CommandParserInput): SampleCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`SAMPLE command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new SyntaxError(`SAMPLE value can not contain brr`);
        }

        return {
            type: 'SAMPLE',
            value,
        } satisfies SampleCommand;
    },
};
