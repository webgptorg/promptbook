import { normalizeTo_SCREAMING_CASE } from '../../_packages/utils.index';
import type { string_markdown_text } from '../../types/typeAliases';
import { extractParameterNames } from '../../utils/extractParameterNames';
import { keepUnused } from '../../utils/organization/keepUnused';
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
    description: `@@`, // <- TODO: [🍭] !!!!!!

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@', // <- TODO: [🍭] !!!!!!

    /**
     * Example usages of the FOREACH command
     */
    examples: [
        'FOREACH List Line -> `{customer}`',
        'FOR List Line -> `{customer}`',
        'EACH List Line -> `{customer}`',
        // <- TODO: [🍭] !!!!!! More
    ],

    /**
     * Parses the FOREACH command
     */
    parse(input: CommandParserInput): ForeachCommand {
        const { args, rawArgs } = input;

        const formatName = normalizeTo_SCREAMING_CASE(args[0] || '');
        const cellName = normalizeTo_SCREAMING_CASE(args[1] || '');
        const assignSign = args[2];
        const parameter = args[3];

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
                // <- TODO: [🏢] Unhardcode format cekks
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

        const parameterNames = extractParameterNames(parameter || rawArgs);

        if (parameterNames.size !== 1) {
            console.info({ args, parameter, rawArgs });
            throw new Error(`FOREACH command contain exactly one parameter, but found ${parameterNames.size}`);
        }

        const parameterName = parameterNames.values().next().value!;

        if (
            typeof parameterName !== 'string'
            // <- TODO: !!!!!! Replace with propper parameter name validation
        ) {
            console.info({ args, parameterName });
            throw new Error(`Invalid parameter name`);
            // <- TODO: !!!!!! Better error (with rules and precise error) from validateParameterName
        }

        return {
            type: 'FOREACH',
            formatName,
            cellName,
            parameterName,
        } satisfies ForeachCommand;
    },

    /**
     * Apply the FOREACH command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ForeachCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        keepUnused(command, $templateJson, $pipelineJson);
        // <- TODO: [🍭] !!!!!! Implement
    },

    /**
     * Converts the FOREACH command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ForeachCommand): string_markdown_text {
        keepUnused(command);
        return ``;
        // <- TODO: [🍭] !!!!!! Implement
    },

    /**
     * Reads the FOREACH command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): Array<ForeachCommand> {
        keepUnused($templateJson);
        return [];
        // <- TODO: [🍭] !!!!!! Implement
    },
};

/**
 * TODO: !!!!!! Comment console logs
 * TODO: [🍭] !!!!!! Make .ptbk.md file with examples of the FOREACH command and also with wrong parsing and logic
 */
