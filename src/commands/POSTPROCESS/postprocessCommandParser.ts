import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { string_markdown_text } from '../../types/typeAliases';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { keepUnused } from '../../utils/organization/keepUnused';
import { isValidJavascriptName } from '../../utils/validators/javascriptName/isValidJavascriptName';
import type { $TaskJson, CommandParserInput, PipelineTaskCommandParser } from '../_common/types/CommandParser';
import type { PostprocessCommand } from './PostprocessCommand';

/**
 * Parses the postprocess command
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
 */
export const postprocessCommandParser: PipelineTaskCommandParser<PostprocessCommand> = {
    /**
     * Name of the command
     */
    name: 'POSTPROCESS',

    aliasNames: ['POSTPROCESSING', 'PP'],

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTask: true,

    /**
     * Description of the POSTPROCESS command
     */
    description: `Defines the postprocess function to be used on the result from LLM and before the result is validated`,

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/31',

    /**
     * Example usages of the POSTPROCESS command
     */
    examples: [
        'POSTPROCESS unwrapResult' /* <- TODO: Make it `POSTPROCESS` examples dynamic, load from all possible postprocess functions */,
    ],

    /**
     * Parses the POSTPROCESS command
     */
    parse(input: CommandParserInput): PostprocessCommand {
        const { args } = input;

        const functionName = args.pop()!;

        if (functionName === undefined) {
            throw new ParseError(`Postprocess function name is required`);
        }

        if (!isValidJavascriptName(functionName)) {
            throw new ParseError(`Invalid postprocess function name "${functionName}"`);
        }

        if (args.length > 0) {
            throw new ParseError(`Can not have more than one postprocess function`);
        }

        return {
            type: 'POSTPROCESS',
            functionName,
        } satisfies PostprocessCommand;
    },

    /**
     * Apply the POSTPROCESS command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `taskJson`
     */
    $applyToTaskJson(command: PostprocessCommand, $taskJson: $TaskJson): $side_effect {
        $taskJson.postprocessingFunctionNames = $taskJson.postprocessingFunctionNames || [];
        $taskJson.postprocessingFunctionNames.push(command.functionName);
    },

    /**
     * Converts the POSTPROCESS command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: PostprocessCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the POSTPROCESS command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<PostprocessCommand> {
        keepUnused($taskJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
