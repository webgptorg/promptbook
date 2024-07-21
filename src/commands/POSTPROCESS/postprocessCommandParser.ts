import { isValidJavascriptName } from '../../utils/validators/javascriptName/isValidJavascriptName';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { PostprocessCommand } from './PostprocessCommand';

/**
 * Parses the postprocess command
 *
 * @see ./POSTPROCESS-README.md for more details
 * @private within the commands folder
 */
export const postprocessCommandParser: CommandParser<PostprocessCommand> = {
    /**
     * Name of the command
     */
    name: 'POSTPROCESS',

    aliasNames: ['POSTPROCESSING', 'PP'],

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_TEMPLATE'],

    /**
     * Description of the POSTPROCESS command
     */
    description: `Defines the postprocess function to be used on the result from LLM and before the result is validated`,

    /**
     * Example usages of the POSTPROCESS command
     */
    examples: [
        'POSTPROCESS unwrapResult' /* <- TODO: !!!!! Make it `POSTPROCESS` examples dynamic, load from all possible postprocess functions */,
    ],

    /**
     * Parses the POSTPROCESS command
     */
    parse(input: CommandParserInput): PostprocessCommand {
        const { args } = input;

        const functionName = args.pop()!;

        if (functionName === undefined) {
            throw new SyntaxError(`Postprocess function name is required`);
        }

        if (!isValidJavascriptName(functionName)) {
            throw new SyntaxError(`Invalid postprocess function name "${functionName}"`);
        }

        if (args.length > 0) {
            throw new SyntaxError(`Can not have more than one postprocess function`);
        }

        return {
            type: 'POSTPROCESS',
            functionName,
        } satisfies PostprocessCommand;
    },
};
