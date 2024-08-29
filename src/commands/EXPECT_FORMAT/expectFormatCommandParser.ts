import spaceTrim from 'spacetrim';
import type { WritableDeep } from 'type-fest';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParsingError } from '../../errors/ParsingError';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { CommandParserInput, PipelineTemplateCommandParser } from '../_common/types/CommandParser';
import type { ExpectCommand } from './ExpectCommand';
import type { ExpectFormatCommand } from './ExpectFormatCommand';

/**
 * Parses the expect command
 *
 * @see ./EXPECT-README.md for more details
 * @private within the commands folder
 */
export const expectCommandParser: PipelineTemplateCommandParser<ExpectCommand> = {
    /**
     * Name of the command
     */
    name: 'EXPECT_AMOUNT',

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the EXPECT_AMOUNT command
     */
    description: spaceTrim(`
        Expect command describes the desired output of the prompt template (after post-processing)
        It can set limits for the maximum/minimum length of the output, measured in characters, words, sentences, paragraphs or some other shape of the output.
    `),

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/30',

    /**
     * Example usages of the EXPECT_AMOUNT command
     */
    examples: [
        'EXPECT MIN 100 Characters',
        'EXPECT MAX 10 Words',
        'EXPECT EXACTLY 3 Sentences',
        'EXPECT EXACTLY 1 Paragraph',
        // <- TODO: 'EXPECT 1 Paragraph',
        'Expect JSON',
    ],

    /**
     * Parses the EXPECT_AMOUNT command
     */
    parse(input: CommandParserInput): ExpectCommand {
        const { normalized } = input;

        if (!normalized.startsWith('EXPECT_JSON')) {
            throw new ParsingError(`For now only JSON format is supported, in future we will support more formats`);
        }

        return {
            type: 'EXPECT_FORMAT',
            format: 'JSON',
        } satisfies ExpectFormatCommand;
        // <- TODO: [🦽] Why this is constantly removed by repair-imports.ts

        // [🥤]
    },

    /**
     * Apply the EXPECT_AMOUNT command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ExpectCommand, templateJson: WritableDeep<PromptTemplateJson>): void {
        if (templateJson.expectFormat !== undefined && command.format !== templateJson.expectFormat) {
            throw new ParsingError(`Expect format is already defined to "${templateJson.expectFormat}".
                Now you try to redefine it by "${command.format}"`);
        }
        templateJson.expectFormat = command.format;
    },

    /**
     * Converts the EXPECT_AMOUNT command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ExpectCommand): string_markdown_text {
        keepUnused(command);
        return `- !!!!!!`;
    },

    /**
     * Reads the EXPECT_AMOUNT command from the `PromptTemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: WritableDeep<PromptTemplateJson>): Array<ExpectCommand> {
        keepUnused(templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};
