import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { validateParameterName } from '../../utils/validators/parameterName/validateParameterName';
import type { $TemplateJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineTemplateCommandParser } from '../_common/types/CommandParser';
import type { JokerCommand } from './JokerCommand';

/**
 * Parses the joker command
 *
 * @see `documentationUrl` for more details
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
    description: `Joker parameter is used instead of executing the template result if jokers value meets the expectations requirements`,

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
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the JOKER command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): ReadonlyArray<JokerCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
