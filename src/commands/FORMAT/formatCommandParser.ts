import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { $TemplateJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineTemplateCommandParser } from '../_common/types/CommandParser';
import type { FormatCommand } from './FormatCommand';

/**
 * Parses the format command
 *
 * @see ./FORMAT-README.md for more details
 * @private within the commands folder
 */
export const formatCommandParser: PipelineTemplateCommandParser<FormatCommand> = {
    /**
     * Name of the command
     */
    name: 'FORMAT',

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the FORMAT command
     */
    description: spaceTrim(`
        Format command describes the desired output of the template (after post-processing)
        It can set limits for the maximum/minimum length of the output, measured in characters, words, sentences, paragraphs or some other shape of the output.
    `),

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/30',

    /**
     * Example usages of the FORMAT command
     */
    examples: ['FORMAT JSON'],

    /**
     * Parses the FORMAT command
     */
    parse(input: CommandParserInput): FormatCommand {
        const { normalized } = input;

        if (!normalized.startsWith('FORMAT_JSON')) {
            throw new ParseError(`For now only JSON format is supported, in future we will support more formats`);
        }

        return {
            type: 'FORMAT',
            format: 'JSON',
        } satisfies FormatCommand;
        // <- TODO: [🦽] Why this is constantly removed by repair-imports.ts

        // [🥤]
    },

    /**
     * Apply the FORMAT command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: FormatCommand, $templateJson: $TemplateJson): void {
        if ($templateJson.format !== undefined && command.format !== $templateJson.format) {
            throw new ParseError(`Format format is already defined to "${$templateJson.format}".
                Now you try to redefine it by "${command.format}"`);
        }
        $templateJson.format = command.format;
    },

    /**
     * Converts the FORMAT command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: FormatCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the FORMAT command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): Array<FormatCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
