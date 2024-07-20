import { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import { ParameterCommand } from './ParameterCommand';

/*
TODO: !!!!!
 raw.startsWith(
            '> {',
        ) /* <- Note: This is a bit hack to parse return parameters defined at the end of each section * /
*/

/**
 * Parses the parameter command
 *
 * @see ./PARAMETER-README.md for more details
 * @private within the commands folder
 */
export const parameterCommandParser: CommandParser<ParameterCommand> = {
    /**
     * Name of the command
     */
    name: 'PARAMETER',

    /**
     * Aliases for the PARAMETER command
     */
    aliases: [
        'PARAM',
        'INPUT_PARAM',
        'OUTPUT_PARAM',
        'INTERMEDIATE_PARAMETER',
        'INPUT_PARAMETER',
        'OUTPUT_PARAMETER',
        'INTERMEDIATE_PARAMETER',
    ],

    /**
     * Description of the PARAMETER command
     */
    description: `Describes one parameter of the prompt template`,

    /**
     * Example usages of the PARAMETER command
     */
    examples: ['PARAMETER foo', 'PARAMETER bar', 'BP foo', 'BP bar'],

    /**
     * Parses the PARAMETER command
     */
    parse(input: CommandParserInput): ParameterCommand {
        const { normalized, raw } = input;

        const parametersMatch = raw.match(/\{(?<parameterName>[a-z0-9_]+)\}[^\S\r\n]*(?<parameterDescription>.*)$/im);

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new SyntaxError(`Invalid parameter`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { parameterName, parameterDescription } = parametersMatch.groups as any;

        if (parameterDescription && parameterDescription.match(/\{(?<parameterName>[a-z0-9_]+)\}/im)) {
            throw new SyntaxError(`Parameter {${parameterName}} can not contain another parameter in description`);
        }

        let isInput = normalized.startsWith('INPUT');
        let isOutput = normalized.startsWith('OUTPUT');

        if (raw.startsWith('> {')) {
            isInput = false;
            isOutput = false;
        }

        return {
            type: 'PARAMETER',
            parameterName,
            parameterDescription: parameterDescription.trim() || null,
            isInput,
            isOutput,
        } satisfies ParameterCommand;
    },
};
