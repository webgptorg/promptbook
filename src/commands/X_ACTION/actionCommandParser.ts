import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { ActionCommand } from './ActionCommand';

/**
 * Parses the action command
 *
 * @see ./ACTION-README.md for more details
 * @private within the commands folder
 */
export const actionCommandParser: CommandParser<ActionCommand> = {
    /**
     * Name of the command
     */
    name: 'ACTION',

    /**
     * ACTION command can be used in:
     */
    isUsedInPipelineHead: true,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the ACTION command
     */
    description: `Actions influences from the pipeline or template into external world. Like turning on a light, sending an email, etc.`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/72',

    /**
     * Example usages of the ACTION command
     */
    examples: ['ACTION'],

    /**
     * Parses the ACTION command
     */
    parse(input: CommandParserInput): ActionCommand {
        const { args } = input;

        TODO_USE(args);

        return {
            type: 'ACTION',
        } satisfies ActionCommand;
    },

    /**
     * Apply the ACTION command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: ActionCommand, pipelineJson: PipelineJson): void {
        keepUnused(command, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Apply the ACTION command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ActionCommand, templateJson: PromptTemplateJson, pipelineJson: PipelineJson): void {
        keepUnused(command, templateJson, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Converts the ACTION command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ActionCommand): string_markdown_text {
        keepUnused(command);
        return `- !!!!!!`;
    },

    /**
     * Reads the ACTION command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<ActionCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Reads the ACTION command from the `PromptTemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: PromptTemplateJson): Array<ActionCommand> {
        keepUnused(templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};
