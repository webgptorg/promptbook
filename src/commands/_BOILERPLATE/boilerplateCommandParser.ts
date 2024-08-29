import type { WritableDeep } from 'type-fest';
import { ParsingError } from '../../errors/ParsingError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type {
    $PipelineJson,
    $TemplateJson,
    CommandParserInput,
    PipelineBothCommandParser,
} from '../_common/types/CommandParser';
import type { BoilerplateCommand } from './BoilerplateCommand';

/**
 * Parses the boilerplate command
 *
 * Note: @@@ This command is used as boilerplate for new commands - it should NOT be used in any `.ptbk.md` file
 *
 * @see ./BOILERPLATE-README.md for more details <- TODO: @@@ Write theese README files OR remove this link + add annotation here (to all commands)
 * @private within the commands folder
 */
export const boilerplateCommandParser: PipelineBothCommandParser<BoilerplateCommand> = {
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
    $applyToPipelineJson(command: BoilerplateCommand, $pipelineJson: $PipelineJson): void {
        keepUnused(command, $pipelineJson);
        throw new ParsingError(
            `BOILERPLATE command is only for testing purposes and should not be used in the .ptbk.md file`,
        );
    },

    /**
     * Apply the BOILERPLATE command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: BoilerplateCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        keepUnused(command, $templateJson, $pipelineJson);
        throw new ParsingError(
            `BOILERPLATE command is only for testing purposes and should not be used in the .ptbk.md file`,
        );
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
        throw new ParsingError(
            `BOILERPLATE command is only for testing purposes and should not be used in the .ptbk.md file`,
        );
    },

    /**
     * Reads the BOILERPLATE command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: WritableDeep<TemplateJson>): Array<BoilerplateCommand> {
        keepUnused(templateJson);
        throw new ParsingError(
            `BOILERPLATE command is only for testing purposes and should not be used in the .ptbk.md file`,
        );
    },
};

/**
 * TODO: !!!!!! Make .ptbk.md file with examples of the BOILERPLATE command and fail
 */
