import spaceTrim from 'spacetrim';
import { ParseError } from '../../errors/ParseError';
import { FORMFACTOR_DEFINITIONS } from '../../formfactors/index';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import type { really_any } from '../../utils/organization/really_any';
import type { $PipelineJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineHeadCommandParser } from '../_common/types/CommandParser';
import type { FormfactorCommand } from './FormfactorCommand';
import { $side_effect } from '../../utils/organization/$side_effect';

/**
 * Parses the formfactor command
 *
 * Note: This command is used as a formfactor for new commands and defines the app type format - it should NOT be used in any `.book` file
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
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
    isUsedInPipelineTask: false,

    /**
     * Description of the FORMFACTOR command
     */
    description: `Specifies the application type and interface requirements that this promptbook should conform to`,

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/168',

    /**
     * Example usages of the FORMFACTOR command
     */
    examples: ['FORMFACTOR Chatbot', 'FF Chat'],

    /**
     * Parses the FORMFACTOR command
     */
    parse(input: CommandParserInput): FormfactorCommand {
        const { args } = input;

        if (args.length !== 1) {
            throw new ParseError(`FORMFACTOR command requires exactly one argument`);
        }

        const formfactorNameCandidate = args[0]!.toUpperCase();

        const formfactor = FORMFACTOR_DEFINITIONS.find((definition) =>
            [definition.name, ...{ aliasNames: [], ...definition }.aliasNames].includes(
                formfactorNameCandidate as really_any,
            ),
        );

        if (formfactor === undefined) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Unknown formfactor name "${formfactorNameCandidate}"

                        Available formfactors:
                        ${block(FORMFACTOR_DEFINITIONS.map(({ name }) => `- ${name}`).join('\n'))}
                    `,
                ),
            );
        }

        return {
            type: 'FORMFACTOR',
            formfactorName: formfactor.name,
        } satisfies FormfactorCommand;
    },

    /**
     * Apply the FORMFACTOR command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: FormfactorCommand, $pipelineJson: $PipelineJson): $side_effect {
        if ($pipelineJson.formfactorName !== undefined && $pipelineJson.formfactorName !== command.formfactorName) {
            throw new ParseError(
                spaceTrim(`
                    Redefinition of \`FORMFACTOR\` in the pipeline head

                    You have used:
                    1) FORMFACTOR \`${$pipelineJson.formfactorName}\`
                    2) FORMFACTOR \`${command.formfactorName}\`
                `),
            );
        }

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
