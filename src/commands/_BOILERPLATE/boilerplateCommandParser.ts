import type { WritableDeep } from 'type-fest';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParsingError } from '../../errors/ParsingError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { BoilerplateCommand } from './BoilerplateCommand';

/**
 * Parses the boilerplate command
 *
 * @see ./BOILERPLATE-README.md for more details <- TODO: @@@ Write theese README files OR remove this link + add annotation here (to all commands)
 * @private within the commands folder
 */
export const boilerplateCommandParser: CommandParser<BoilerplateCommand> = {
    /**
     * Name of the command
     */
    name: 'BOILERPLATE',

    /**
     * Aliases for the BOILERPLATE command
     */
    aliasNames: ['BP'],

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: true,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the BOILERPLATE command
     */
    description: `@@`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    /**
     * Example usages of the BOILERPLATE command
     */
    examples: ['BOILERPLATE foo', 'BOILERPLATE bar', 'BP foo', 'BP bar'],

    /**
     * Parses the BOILERPLATE command
     */
    parse(input: CommandParserInput): BoilerplateCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new ParsingError(`BOILERPLATE command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new ParsingError(`BOILERPLATE value can not contain brr`);
        }

        return {
            type: 'BOILERPLATE',
            value,
        } satisfies BoilerplateCommand;
    },

    /**
     * Apply the BOILERPLATE command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: BoilerplateCommand, pipelineJson: WritableDeep<PipelineJson>): void {
        keepUnused(command, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Apply the BOILERPLATE command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(
        command: BoilerplateCommand,
        templateJson: WritableDeep<PromptTemplateJson>,
        pipelineJson: WritableDeep<PipelineJson>,
    ): void {
        keepUnused(command, templateJson, pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Converts the BOILERPLATE command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: BoilerplateCommand): string_markdown_text {
        keepUnused(command);
        return `- !!!!!!`;
    },

    /**
     * Reads the BOILERPLATE command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<BoilerplateCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Reads the BOILERPLATE command from the `PromptTemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: PromptTemplateJson): Array<BoilerplateCommand> {
        keepUnused(templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};

/**
 * TODO: !!!!!! What is this command for? Make more descriptive annotation above each command
 * TODO: [💐] Implement BOILERPLATE command into `pipelineStringToJsonSync` function
 */
