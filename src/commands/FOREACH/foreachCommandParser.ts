import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type {
    $PipelineJson,
    $TemplateJson,
    CommandParserInput,
    PipelineTemplateCommandParser,
} from '../_common/types/CommandParser';
import type { ForeachCommand } from './ForeachCommand';

/**
 * Parses the foreach command
 *
 * Note: @@@ This command is used as foreach for new commands - it should NOT be used in any `.ptbk.md` file
 *
 * @see ./FOREACH-README.md for more details <- TODO: @@@ Write theese README files OR remove this link + add annotation here (to all commands)
 * @private within the commands folder
 */
export const foreachCommandParser: PipelineTemplateCommandParser<ForeachCommand> = {
    /**
     * Name of the command
     */
    name: 'FOREACH',

    /**
     * Aliases for the FOREACH command
     */
    aliasNames: ['FOR', 'EACH'],

    /**
     * FOREACH command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the FOREACH command
     */
    description: `@@`, // <- TODO: [🍭]

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@', // <- TODO: [🍭]

    /**
     * Example usages of the FOREACH command
     */
    examples: [
        'FOREACH List Line -> `{customer}`',
        'FOR List Line -> `{customer}`',
        'EACH List Line -> `{customer}`',
        // <- TODO: [🍭] More
    ],

    /**
     * Parses the FOREACH command
     */
    parse(input: CommandParserInput): ForeachCommand {
        const { args } = input;

        keepUnused(args);
        // <- TODO: [🍭] Implement

        return {
            type: 'FOREACH',
        } satisfies ForeachCommand;
    },

    /**
     * Apply the FOREACH command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ForeachCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        keepUnused(command, $templateJson, $pipelineJson);
        // <- TODO: [🍭] Implement
    },

    /**
     * Converts the FOREACH command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ForeachCommand): string_markdown_text {
        keepUnused(command);
        return ``;
        // <- TODO: [🍭] Implement
    },

    /**
     * Reads the FOREACH command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): Array<ForeachCommand> {
        keepUnused($templateJson);
        return [];
        // <- TODO: [🍭] Implement
    },
};

/**
 * TODO: [🍭] Make .ptbk.md file with examples of the FOREACH command and also with wrong parsing and logic
 */
