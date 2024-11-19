import spaceTrim from 'spacetrim';
import { ParseError } from '../../errors/ParseError';
import { FORMFACTOR_DEFINITIONS } from '../../formfactors/index';
import type { string_formfactor_name } from '../../formfactors/_common/string_formfactor_name';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import type { $PipelineJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineHeadCommandParser } from '../_common/types/CommandParser';
import type { FormfactorCommand } from './FormfactorCommand';

/**
 * Parses the formfactor command
 *
 * Note: @@@ This command is used as formfactor for new commands - it should NOT be used in any `.book.md` file
 *
 * @see `documentationUrl` for more details
 * @private within the commands folder
 */
export const formfactorCommandParser: PipelineHeadCommandParser<FormfactorCommand> = {
    /**
     * Name of the command
     */
    name: 'FORMFACTOR',

    /**
     * Aliases for the FORMFACTOR command
     */
    aliasNames: ['FORM', 'FF'],

    /**
     * FORMFACTOR command can be used in:
     */
    isUsedInPipelineHead: true,
    isUsedInPipelineTemplate: false,

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
    examples: ['FORMFACTOR Chat', 'FORMFACTOR Generic'],

    /**
     * Parses the FORMFACTOR command
     */
    parse(input: CommandParserInput): FormfactorCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new ParseError(`FORMFACTOR command requires exactly one argument`);
        }

        const formfactorName = args[0]!.toUpperCase() as string_formfactor_name;

        if (!FORMFACTOR_DEFINITIONS.some((definition) => definition.name === formfactorName)) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Unknown formfactor name "${formfactorName}"

                        Available formfactors:
                        ${block(FORMFACTOR_DEFINITIONS.map(({ name }) => `- ${name}`).join('\n'))}
                    `,
                ),
            );
        }

        return {
            type: 'FORMFACTOR',
            formfactorName,
        } satisfies FormfactorCommand;
    },

    /**
     * Apply the FORMFACTOR command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: FormfactorCommand, $pipelineJson: $PipelineJson): void {
        $pipelineJson.formfactorName = command.formfactorName;
    },

    /**
     * Converts the FORMFACTOR command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: FormfactorCommand): string_markdown_text {
        return `FORMFACTOR ${command.formfactorName}`;
    },

    /**
     * Reads the FORMFACTOR command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<FormfactorCommand> {
        return [
            {
                type: 'FORMFACTOR',
                formfactorName: pipelineJson.formfactorName,
            },
        ];
    },
};
