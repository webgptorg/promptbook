import type { CommandParser } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PostprocessingCommand } from './PostprocessingCommand';

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
     * Description of the POSTPROCESSING command
     */
    description: `Defines the postprocessing function to be used on the result from LLM and before the result is validated`,

    /**
     * Example usages of the POSTPROCESSING command
     */
    examples: [
        'POSTPROCESSING unwrapResult' /* <- TODO: !!!!! Make it dynamic, load from all possible postprocessing functions */,
    ],

    /**
     * Parses the POSTPROCESSING command
     */
    parse(input: CommandParserInput): PostprocessingCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new SyntaxError(`POSTPROCESSING command requires exactly one argument`);
        }

        const functionName = args.pop()!;

        // TODO: Validate functionName

        return {
            type: 'POSTPROCESS',
            functionName,
        } satisfies PostprocessingCommand;
    },
};
