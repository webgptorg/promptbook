import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { InstrumentCommand } from './InstrumentCommand';

/**
 * Parses the instrument command
 *
 * @see ./INSTRUMENT-README.md for more details
 * @private within the commands folder
 */
export const instrumentCommandParser: CommandParser<InstrumentCommand> = {
    /**
     * Name of the command
     */
    name: 'INSTRUMENT',

    /**
     * INSTRUMENT command can be used in:
     */
    usagePlaces: ['PIPELINE_HEAD', 'PIPELINE_TEMPLATE'],

    /**
     * Description of the INSTRUMENT command
     */
    description: `Instrument command is used to specify the instrument to be used in the pipeline or template like search, calculate, etc.`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/71',

    /**
     * Example usages of the INSTRUMENT command
     */
    examples: ['INSTRUMENT'],

    /**
     * Parses the INSTRUMENT command
     */
    parse(input: CommandParserInput): InstrumentCommand {
        const { args } = input;

        TODO_USE(args);

        return {
            type: 'INSTRUMENT',
        } satisfies InstrumentCommand;
    },

    /**
     * Apply the INSTRUMENT command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: InstrumentCommand, pipelineJson: PipelineJson): void {
        keepUnused(command, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Apply the INSTRUMENT command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(
        command: InstrumentCommand,
        templateJson: PromptTemplateJson,
        pipelineJson: PipelineJson,
    ): void {
        keepUnused(command, templateJson, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Converts the INSTRUMENT command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: InstrumentCommand): string_markdown_text {
        return `- !!!!!!`;
    },

    /**
     * Reads the INSTRUMENT command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<InstrumentCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Reads the INSTRUMENT command from the `PromptTemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: PromptTemplateJson): Array<InstrumentCommand> {
        keepUnused(templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};
