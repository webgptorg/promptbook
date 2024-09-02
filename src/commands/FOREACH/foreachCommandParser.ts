import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import type { string_markdown_text } from '../../types/typeAliases';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { keepUnused } from '../../utils/organization/keepUnused';
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
    description: `@@`, // <- TODO: [🍭] !!!!!!

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@', // <- TODO: [🍭] !!!!!!

    /**
     * Example usages of the FOREACH command
     */
    examples: [
        'FOREACH List Line `{customers}` -> `{customer}`',
        'FOR List Line `{customers}` -> `{customer}`',
        'EACH List Line `{customers}` -> `{customer}`',
        // <- TODO: [🍭] !!!!!! More
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
        const subparameterNameWrapped = args[4];

        if (
            ![
                'LIST',
                'CSV',
                // <- TODO: [🏢] Unhardcode formats
            ].includes(formatName!)
        ) {
            console.info({ args, formatName });
            throw new Error(`Unsupported format "${formatName}"`);
            // <- TODO: [🏢] List all supported format names
        }

        if (
            ![
                'LINE',
                'ROW',
                'COLUMN',
                'CELL',
                // <- TODO: [🏢] Unhardcode format cells
            ].includes(cellName!)
        ) {
            console.info({ args, cellName });
            throw new Error(`Format ${formatName} does not support cell "${cellName}"`);
            // <- TODO: [🏢] List all supported cell names for the format
        }

        if (assignSign !== '->') {
            console.info({ args, assignSign });
            throw new Error(`FOREACH command must have '->' to assign the value to the parameter`);
        }

        // TODO: !!!!!! Replace with propper parameter name validation
        if (
            parameterNameWrapped?.substring(0, 1) !== '{' ||
            parameterNameWrapped?.substring(parameterNameWrapped.length - 1, parameterNameWrapped.length) !== '}'
        ) {
            console.info(
                { args, parameterNameWrapped },
                parameterNameWrapped?.substring(0, 1),
                parameterNameWrapped?.substring(parameterNameWrapped.length - 1, parameterNameWrapped.length),
            );
            throw new Error(`!!!!!! 1 Here will be error (with rules and precise error) from validateParameterName`);
        }
        const parameterName = parameterNameWrapped.substring(1, parameterNameWrapped.length - 1);

        // TODO: !!!!!! Replace with propper parameter name validation
        if (
            subparameterNameWrapped?.substring(0, 1) !== '{' ||
            subparameterNameWrapped?.substring(subparameterNameWrapped.length - 1, subparameterNameWrapped.length) !==
                '}'
        ) {
            console.info({ args, subparameterNameWrapped });
            throw new Error(`!!!!!! 2 Here will be error (with rules and precise error) from validateParameterName`);
        }
        const subparameterName = subparameterNameWrapped.substring(1, subparameterNameWrapped.length - 1);

        return {
            type: 'FOREACH',
            formatName,
            cellName,
            parameterName,
            subparameterName,
        } satisfies ForeachCommand;
    },

    /**
     * Apply the FOREACH command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ForeachCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        const { formatName, cellName, parameterName, subparameterName } = command;

Detect double use



        $templateJson.foreach = { formatName, cellName, parameterName, subparameterName };

        keepUnused($pipelineJson); // <- TODO: !!!!!! BUT Maybe register subparameter from foreach into parameters of the pipeline

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
 * TODO: !!!!!! Comment console logs
 * TODO: [🍭] !!!!!! Make .ptbk.md file with examples of the FOREACH command and also with wrong parsing and logic
 */
