import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type {
    $PipelineJson,
    $TemplateJson,
    CommandParserInput,
    PipelineBothCommandParser,
} from '../_common/types/CommandParser';
import type { ParameterCommand } from './ParameterCommand';

/**
 * Parses the parameter command
 *
 * @see ./PARAMETER-README.md for more details
 * @private within the commands folder
 */
export const parameterCommandParser: PipelineBothCommandParser<ParameterCommand> = {
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
    isUsedInPipelineHead: true,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the PARAMETER command
     */
    description: `Describes one parameter of the template`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/68',

    /**
     * Example usages of the PARAMETER command
     */
    examples: ['PARAMETER {title} Title of the book', 'OUTPUT PARAMETER {websiteContent} Content of the book'],

    /**
     * Parses the PARAMETER command
     */
    parse(input: CommandParserInput): ParameterCommand {
        const { normalized, raw } = input;

        const parametersMatch = raw.match(/\{(?<parameterName>[a-z0-9_]+)\}[^\S\r\n]*(?<parameterDescription>.*)$/im);

        if (!parametersMatch || !parametersMatch.groups || !parametersMatch.groups.parameterName) {
            throw new ParseError(`Invalid parameter`);
        }

        const { parameterName, parameterDescription } = parametersMatch.groups as TODO_any;

        if (parameterDescription && parameterDescription.match(/\{(?<parameterName>[a-z0-9_]+)\}/im)) {
            throw new ParseError(`Parameter {${parameterName}} can not contain another parameter in description`);
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

    /**
     * Apply the PARAMETER command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: ParameterCommand, $pipelineJson: $PipelineJson): void {
        keepUnused(command, $pipelineJson);
        // Note: [🍣] Do nothing, its application is implemented separately in `pipelineStringToJsonSync`
    },

    /**
     * Apply the PARAMETER command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: ParameterCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        keepUnused(command, $templateJson, $pipelineJson);
        // Note: [🍣] Do nothing, its application is implemented separately in `pipelineStringToJsonSync`
    },

    /**
     * Converts the PARAMETER command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: ParameterCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the PARAMETER command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<ParameterCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },

    /**
     * Reads the PARAMETER command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): Array<ParameterCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};
