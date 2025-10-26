import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { string_markdown_text } from '../../types/typeAliases';
import { $side_effect } from '../../utils/organization/$side_effect';
import { keepUnused } from '../../utils/organization/keepUnused';
import { validateParameterName } from '../../utils/validators/parameterName/validateParameterName';
import type { $TaskJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineTaskCommandParser } from '../_common/types/CommandParser';
import type { JokerCommand } from './JokerCommand';

/**
 * Parses the joker command
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
 */
export const jokerCommandParser: PipelineTaskCommandParser<JokerCommand> = {
    /**
     * Name of the command
     */
    name: 'JOKER',

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTask: true,

    /**
     * Description of the JOKER command
     */
    description: `Joker parameter is used instead of executing the task result if jokers value meets the expectations requirements`,

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/66',

    /**
     * Example usages of the JOKER command
     */
    examples: ['JOKER {documentTitle}'],

    /**
     * Parses the JOKER command
     */
    parse(input: CommandParserInput): JokerCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new ParseError(`JOKE command expects exactly one parameter name`);
        }

        const parameterNameArg = args[0] || '';

        const parameterName = validateParameterName(parameterNameArg);

        return {
            type: 'JOKER',
            parameterName,
        } satisfies JokerCommand;
    },

    /**
     * Apply the JOKER command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `taskJson`
     */
    $applyToTaskJson(command: JokerCommand, $taskJson: $TaskJson): $side_effect {
        $taskJson.jokerParameterNames = $taskJson.jokerParameterNames || [];
        $taskJson.jokerParameterNames.push(command.parameterName);
    },

    /**
     * Converts the JOKER command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: JokerCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the JOKER command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<JokerCommand> {
        keepUnused($taskJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
