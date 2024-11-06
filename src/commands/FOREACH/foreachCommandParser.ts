import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import { FORMAT_DEFINITIONS } from '../../formats/index';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_parameter_name } from '../../types/typeAliases';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { keepUnused } from '../../utils/organization/keepUnused';
import { validateParameterName } from '../../utils/validators/parameterName/validateParameterName';
import type { $PipelineJson } from '../_common/types/CommandParser';
import type { $TemplateJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineTemplateCommandParser } from '../_common/types/CommandParser';
import type { ForeachCommand } from './ForeachCommand';

/**
 * Parses the foreach command
 *
 * Note: @@@ This command is used as foreach for new commands - it should NOT be used in any `.ptbk.md` file
 *
 * @see `documentationUrl` for more details
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
    description: `@@`,

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/148',

    /**
     * Example usages of the FOREACH command
     */
    examples: [
        'FOREACH Text Line `{customers}` -> `{customer}`',
        'FOREACH Csv Cell `{customers}` -> `{cell}`',
        'FOREACH Csv Row `{customers}` -> `{firstName}`, `{lastName}`, `+{email}`',
        'FOR Text Line `{customers}` -> `{customer}`',
        'EACH Text Line `{customers}` -> `{customer}`',
    ],

    /**
     * Parses the FOREACH command
     */
    parse(input: CommandParserInput): ForeachCommand {
        const { args } = input;

        const formatName = normalizeTo_SCREAMING_CASE(args[0] || '');
        const subformatName = normalizeTo_SCREAMING_CASE(args[1] || '');
        const parameterNameArg = args[2] || '';
        const assignSign = args[3];

        const formatDefinition = FORMAT_DEFINITIONS.find(
            (formatDefinition) =>
                [formatDefinition.formatName, ...(formatDefinition.aliases || [])].includes(formatName),

            // <- Note: [⛷]
            // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as dynamic plugins
        );

        if (formatDefinition === undefined) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Unsupported format "${formatName}"

                        Available formats:
                        ${block(
                            FORMAT_DEFINITIONS.map((formatDefinition) => formatDefinition.formatName)
                                .map((formatName) => `- ${formatName}`)
                                .join('\n'),
                        )}
                    `,
                ),
            );
            // <- TODO: [🏢] List all supported format names
        }

        const subvalueDefinition = formatDefinition.subvalueDefinitions.find(
            (subvalueDefinition) =>
                [subvalueDefinition.subvalueName, ...(subvalueDefinition.aliases || [])].includes(subformatName),
            // <- Note: [⛷]
            // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as dynamic plugins
        );

        if (subvalueDefinition === undefined) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Unsupported subformat name "${subformatName}" for format "${formatName}"

                        Available subformat names for format "${formatDefinition.formatName}":
                        ${block(
                            formatDefinition.subvalueDefinitions
                                .map((subvalueDefinition) => subvalueDefinition.subvalueName)
                                .map((subvalueName) => `- ${subvalueName}`)
                                .join('\n'),
                        )}
                    `,
                ),
            );
            // <- TODO: [🏢] List all supported subformat names for the format
        }

        if (assignSign !== '->') {
            throw new ParseError(`FOREACH command must have '->' to assign the value to the parameter`);
        }

        const parameterName = validateParameterName(parameterNameArg);

        let outputSubparameterName: string_parameter_name | null = null;

        // TODO: [4] DRY
        const inputSubparameterNames = args
            .slice(4)
            .map((parameterName) => parameterName.split(',').join(' ').trim())
            .filter((parameterName) => !parameterName.includes('+'))
            .filter((parameterName) => parameterName !== '')
            .map(validateParameterName);

        // TODO: [4] DRY
        const outputSubparameterNames = args
            .slice(4)
            .map((parameterName) => parameterName.split(',').join(' ').trim())
            .filter((parameterName) => parameterName.includes('+'))
            .map((parameterName) => parameterName.split('+').join(''))
            .map(validateParameterName);

        if (outputSubparameterNames.length === 1) {
            outputSubparameterName = outputSubparameterNames[0]!;
        } else if (outputSubparameterNames.length > 1) {
            throw new ParseError(`FOREACH command can not have more than one output subparameter`);
        }

        if (inputSubparameterNames.length === 0) {
            throw new ParseError(`FOREACH command must have at least one input subparameter`);
        }

        if (outputSubparameterName === null) {
            // TODO: Following code should be unhardcoded from here and moved to the format definition
            if (formatName === 'CSV' && subformatName === 'CELL') {
                outputSubparameterName = 'newCell';
            } else if (formatName === 'TEXT' && subformatName === 'LINE') {
                outputSubparameterName = 'newLine';
            } else {
                throw new ParseError(
                    spaceTrim(`
                        FOREACH ${formatName} ${subformatName} must specify output subparameter

                        Correct example:
                        - FOREACH ${formatName} ${subformatName} {${parameterName}} -> {inputSubparameterName1}, {inputSubparameterName2}, +{outputSubparameterName}

                    `),
                );
            }
        }

        return {
            type: 'FOREACH',
            formatName,
            subformatName,
            parameterName,
            inputSubparameterNames,
            outputSubparameterName,
        } satisfies ForeachCommand;
    },

    /**
     * Apply the FOREACH command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ForeachCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        const { formatName, subformatName, parameterName, inputSubparameterNames, outputSubparameterName } = command;

        // TODO: [🍭] Detect double use
        // TODO: [🍭] Detect usage with JOKER and don't allow it

        $templateJson.foreach = {
            formatName,
            subformatName,
            parameterName,
            inputSubparameterNames,
            outputSubparameterName,
        };

        keepUnused($pipelineJson); // <- TODO: [🧠] Maybe register subparameter from foreach into parameters of the pipeline

        // Note: [🍭] FOREACH apply has some sideeffects on different places in codebase
    },

    /**
     * Converts the FOREACH command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ForeachCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the FOREACH command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): ReadonlyArray<ForeachCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};

/**
 * TODO: [🍭] Make .ptbk.md file with examples of the FOREACH with wrong parsing and logic
 */
