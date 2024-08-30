import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { $TemplateJson, CommandParserInput, PipelineTemplateCommandParser } from '../_common/types/CommandParser';
import type { JokerCommand } from './JokerCommand';

/**
 * Parses the joker command
 *
 * @see ./JOKER-README.md for more details
 * @private within the commands folder
 */
export const jokerCommandParser: PipelineTemplateCommandParser<JokerCommand> = {
    /**
     * Name of the command
     */
    name: 'JOKER',

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the JOKER command
     */
    description: `Joker parameter is used instead of executing the prompt template if it meet the expectations requirements`,

    /**
     * Link to discussion
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

        const parametersMatch = (args.pop() || '').match(/^\{(?<parameterName>[a-z0-9_]+)\}$/im);

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new ParseError(`Invalid joker`);
        }

        const { parameterName } = parametersMatch.groups as TODO_any;

        return {
            type: 'JOKER',
            parameterName,
        } satisfies JokerCommand;
    },

    /**
     * Apply the JOKER command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: JokerCommand, $templateJson: $TemplateJson): void {
        $templateJson.jokerParameterNames = $templateJson.jokerParameterNames || [];
        $templateJson.jokerParameterNames.push(command.parameterName);
    },

    /**
     * Converts the JOKER command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: JokerCommand): string_markdown_text {
        keepUnused(command);
        return `- !!!!!!`;
    },

    /**
     * Reads the JOKER command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): Array<JokerCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};
