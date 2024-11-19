import { ParseError } from '../../errors/ParseError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type {
    $PipelineJson,
    $TemplateJson,
    CommandParserInput,
    PipelineBothCommandParser,
} from '../_common/types/CommandParser';
import type { FormfactorCommand } from './FormfactorCommand';

/**
 * Parses the formfactor command
 *
 * Note: @@@ This command is used as formfactor for new commands - it should NOT be used in any `.book.md` file
 *
 * @see `documentationUrl` for more details
 * @private within the commands folder
 */
export const formfactorCommandParser: PipelineBothCommandParser<FormfactorCommand> = {
    /**
     * Name of the command
     */
    name: 'FORMFACTOR',

    /**
     * Aliases for the FORMFACTOR command
     */
    aliasNames: ['BP'],

    /**
     * FORMFACTOR command can be used in:
     */
    isUsedInPipelineHead: true,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the FORMFACTOR command
     */
    description: `@@`,

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/168',

    /**
     * Example usages of the FORMFACTOR command
     */
    examples: ['FORMFACTOR foo', 'FORMFACTOR bar', 'BP foo', 'BP bar'],

    /**
     * Parses the FORMFACTOR command
     */
    parse(input: CommandParserInput): FormfactorCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new ParseError(`FORMFACTOR command requires exactly one argument`);
        }

        const value = args[0]!.toLowerCase();

        if (value.includes('brr')) {
            throw new ParseError(`FORMFACTOR value can not contain brr`);
        }

        return {
            type: 'FORMFACTOR',
            value,
        } satisfies FormfactorCommand;
    },

    /**
     * Apply the FORMFACTOR command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: FormfactorCommand, $pipelineJson: $PipelineJson): void {
        keepUnused(command, $pipelineJson);
        throw new ParseError(
            `FORMFACTOR command is only for testing purposes and should not be used in the .book.md file`,
        );
    },

    /**
     * Apply the FORMFACTOR command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: FormfactorCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        keepUnused(command, $templateJson, $pipelineJson);
        throw new ParseError(
            `FORMFACTOR command is only for testing purposes and should not be used in the .book.md file`,
        );
    },

    /**
     * Converts the FORMFACTOR command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: FormfactorCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the FORMFACTOR command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<FormfactorCommand> {
        keepUnused(pipelineJson);
        throw new ParseError(
            `FORMFACTOR command is only for testing purposes and should not be used in the .book.md file`,
        );
    },

    /**
     * Reads the FORMFACTOR command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): ReadonlyArray<FormfactorCommand> {
        keepUnused($templateJson);
        throw new ParseError(
            `FORMFACTOR command is only for testing purposes and should not be used in the .book.md file`,
        );
    },
};
