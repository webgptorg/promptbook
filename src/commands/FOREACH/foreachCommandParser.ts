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
import type { $TaskJson } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { PipelineTaskCommandParser } from '../_common/types/CommandParser';
import type { ForeachCommand } from './ForeachCommand';
import { $side_effect } from '../../utils/organization/$side_effect';

/**
 * Parses the foreach command
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
 */
export const foreachCommandParser: PipelineTaskCommandParser<ForeachCommand> = {
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
    isUsedInPipelineTask: true,

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

        const subvalueParser = formatDefinition.subvalueParsers.find(
            (subvalueParser) =>
                [subvalueParser.subvalueName, ...(subvalueParser.aliases || [])].includes(subformatName),
            // <- Note: [⛷]
            // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as dynamic plugins
        );

        if (subvalueParser === undefined) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Unsupported subformat name "${subformatName}" for format "${formatName}"

                        Available subformat names for format "${formatDefinition.formatName}":
                        ${block(
                            formatDefinition.subvalueParsers
                                .map((subvalueParser) => subvalueParser.subvalueName)
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
     * Note: `$` is used to indicate that this function mutates given `taskJson`
     */
    $applyToTaskJson(command: ForeachCommand, $taskJson: $TaskJson, $pipelineJson: $PipelineJson): $side_effect{
        const { formatName, subformatName, parameterName, inputSubparameterNames, outputSubparameterName } = command;

        // TODO: [🍭] Detect double use
        // TODO: [🍭] Detect usage with JOKER and don't allow it

        $taskJson.foreach = {
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
     * Reads the FOREACH command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<ForeachCommand> {
        keepUnused($taskJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};

/**
 * TODO: [🍭] Make .book.md file with examples of the FOREACH with wrong parsing and logic
 */
