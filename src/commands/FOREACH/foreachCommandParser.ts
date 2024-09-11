import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import { FORMAT_DEFINITIONS } from '../../formats/index';
import type { string_markdown_text } from '../../types/typeAliases';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { keepUnused } from '../../utils/organization/keepUnused';
import { validateParameterName } from '../../utils/validators/parameterName/validateParameterName';
import type {
    $PipelineJson,
    $TemplateJson,
    CommandParserInput,
    PipelineTemplateCommandParser,
} from '../_common/types/CommandParser';
import type { ForeachCommand } from './ForeachCommand';

/**
 * Parses the foreach command
 *
 * Note: @@@ This command is used as foreach for new commands - it should NOT be used in any `.ptbk.md` file
 *
 * @see ./FOREACH-README.md for more details <- TODO: @@@ Write theese README files OR remove this link + add annotation here (to all commands)
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
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/148',

    /**
     * Example usages of the FOREACH command
     */
    examples: [
        'FOREACH Text Line `{customers}` -> `{customer}`',
        'FOR Csv Row `{customers}` -> `{firstName}`, `{lastName}`',
        'EACH Csv Cell `{customers}` -> `{cell}`',
    ],

    /**
     * Parses the FOREACH command
     */
    parse(input: CommandParserInput): ForeachCommand {
        const { args } = input;

        const formatName = normalizeTo_SCREAMING_CASE(args[0] || '');
        const cellName = normalizeTo_SCREAMING_CASE(args[1] || '');
        const parameterNameWrapped = args[2];
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
                [subvalueDefinition.subvalueName, ...(subvalueDefinition.aliases || [])].includes(cellName),
            // <- Note: [⛷]
            // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as dynamic plugins
        );

        if (subvalueDefinition === undefined) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Unsupported cell name "${cellName}" for format "${formatName}"

                        Available cell names for format "${formatDefinition.formatName}":
                        ${block(
                            formatDefinition.subvalueDefinitions
                                .map((subvalueDefinition) => subvalueDefinition.subvalueName)
                                .map((subvalueName) => `- ${subvalueName}`)
                                .join('\n'),
                        )}
                    `,
                ),
            );
            // <- TODO: [🏢] List all supported cell names for the format
        }

        if (assignSign !== '->') {
            throw new ParseError(`FOREACH command must have '->' to assign the value to the parameter`);
        }

        // TODO: !!! Replace with propper parameter name validation `validateParameterName`
        if (
            parameterNameWrapped?.substring(0, 1) !== '{' ||
            parameterNameWrapped?.substring(parameterNameWrapped.length - 1, parameterNameWrapped.length) !== '}'
        ) {
            throw new ParseError(
                `Invalid parameter name "${parameterNameWrapped}" - must be wrapped in curly brackets: {parameterName}`,
                // <- Note: Here will be error (with rules and precise error) from validateParameterName
            );
        }
        const parameterName = parameterNameWrapped.substring(1, parameterNameWrapped.length - 1);

        const subparameterNames = args
            .slice(4)
            .map((parameterName) => parameterName.split(',').join(' ').trim())
            .filter((parameterName) => parameterName !== '')
            .map(validateParameterName);

        if (subparameterNames.length === 0) {
            throw new ParseError(`FOREACH command must have at least one subparameter`);
        }

        return {
            type: 'FOREACH',
            formatName,
            cellName,
            parameterName,
            subparameterNames,
        } satisfies ForeachCommand;
    },

    /**
     * Apply the FOREACH command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ForeachCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        const { formatName, cellName, parameterName, subparameterNames } = command;

        // TODO: !!!!!! Detect double use
        // TODO: !!!!!! Detect usage with JOKER and don't allow it

        $templateJson.foreach = { formatName, cellName, parameterName, subparameterNames };

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
    takeFromTemplateJson($templateJson: $TemplateJson): Array<ForeachCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};

/**
 * TODO: [🧠][🦥] Better (less confusing) name for "cell" / "subvalue" / "subparameter"
 * TODO: [🍭] !!!!!! Make .ptbk.md file with examples of the FOREACH command and also with wrong parsing and logic
 */
