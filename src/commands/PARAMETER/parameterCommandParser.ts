import { ParsingError } from '../../errors/ParsingError';
import type { TODO } from '../../types/typeAliases';
import type { CommandParser } from '../_common/types/CommandParser';
import type { CommandParserInput } from '../_common/types/CommandParser';
import type { ParameterCommand } from './ParameterCommand';

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
    aliasNames: ['PARAM', 'INPUT_PARAM', 'OUTPUT_PARAM', 'INPUT_PARAMETER', 'OUTPUT_PARAMETER'],

    /*
    Note: [🦈] No need for extra alias name because it is already preprocessed
    */

    /**
     * BOILERPLATE command can be used in:
     */
    usagePlaces: ['PIPELINE_HEAD', 'PIPELINE_TEMPLATE'],

    /**
     * Description of the PARAMETER command
     */
    description: `Describes one parameter of the prompt template`,

    /**
     * Link to discussion
     */
    discussionUrl: 'https://github.com/webgptorg/promptbook/discussions/68',

    /**
     * Example usages of the PARAMETER command
     */
    examples: ['PARAMETER {title} Title of the book', 'OUTPUT PARAMETER {content} Content of the book'],

    /**
     * Parses the PARAMETER command
     */
    parse(input: CommandParserInput): ParameterCommand {
        const { normalized, raw } = input;

        const parametersMatch = raw.match(/\{(?<parameterName>[a-z0-9_]+)\}[^\S\r\n]*(?<parameterDescription>.*)$/im);

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new ParsingError(`Invalid parameter`);
        }

        const { parameterName, parameterDescription } = parametersMatch.groups as TODO;

        if (parameterDescription && parameterDescription.match(/\{(?<parameterName>[a-z0-9_]+)\}/im)) {
            throw new ParsingError(`Parameter {${parameterName}} can not contain another parameter in description`);
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
