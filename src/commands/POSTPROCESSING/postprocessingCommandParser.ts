import { isValidJavascriptName } from '../../utils/validators/javascriptName/isValidJavascriptName';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
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

    aliasNames: ['POSTPROCESS', 'PP'],

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_TEMPLATE'],

    /**
     * Description of the POSTPROCESSING command
     */
    description: `Defines the postprocessing function to be used on the result from LLM and before the result is validated`,

    /**
     * Example usages of the POSTPROCESSING command
     */
    examples: [
        'POSTPROCESSING unwrapResult' /* <- TODO: !!!!! Make it `POSTPROCESSING` examples dynamic, load from all possible postprocessing functions */,
    ],

    /**
     * Parses the POSTPROCESSING command
     */
    parse(input: CommandParserInput): PostprocessingCommand {
        const { args } = input;

        const functionName = args.pop()!;

        if (functionName === undefined) {
            throw new SyntaxError(`Postprocessing function name is required`);
        }

        if (!isValidJavascriptName(functionName)) {
            throw new SyntaxError(`Invalid postprocessing function name "${functionName}"`);
        }

        if (args.length > 0) {
            throw new SyntaxError(`Can not have more than one postprocessing function`);
        }

        return {
            type: 'POSTPROCESS',
            functionName,
        } satisfies PostprocessingCommand;
    },
};
