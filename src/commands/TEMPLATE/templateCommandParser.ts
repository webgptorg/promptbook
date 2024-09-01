import spaceTrim from 'spacetrim';
import type { WritableDeep } from 'type-fest';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { knowledgeCommandParser } from '../KNOWLEDGE/knowledgeCommandParser';
import type {
    $PipelineJson,
    $TemplateJson,
    CommandParserInput,
    PipelineTemplateCommandParser,
} from '../_common/types/CommandParser';
import type { TemplateCommand } from './TemplateCommand';
import { TemplateTypes } from './TemplateTypes';

/**
 * Parses the template command
 *
 * @see ./TEMPLATE-README.md for more details
 * @private within the commands folder
 */
export const templateCommandParser: PipelineTemplateCommandParser<TemplateCommand> = {
    /**
     * Name of the command
     */
    name: 'TEMPLATE',

    /**
     * Aliases for the TEMPLATE command
     */
    aliasNames: [
        'PROMPT',
        'SIMPLE',
        'SCRIPT',
        'DIALOG',
        'SAMPLE',
        'EXAMPLE',
        'KNOWLEDGE', // <- Note: [⛱]
        'INSTRUMENT', // <- Note: [⛱]
        'ACTION', // <- Note: [⛱]
    ],

    /**
     * Aliases for the TEMPLATE command
     */
    deprecatedNames: ['BLOCK', 'EXECUTE'],

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the TEMPLATE command
     */
    description: `What should the code template template do`,

    /**
     * Link to discussion
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/64',

    /**
     * Example usages of the TEMPLATE command
     */
    examples: [
        // Short form:
        'PROMPT',
        'SIMPLE',
        'SCRIPT',
        'DIALOG',
        // <- [🅱]
        'SAMPLE',
        'KNOWLEDGE', // <- Note:  [⛱] Thare can not be confusion with KNOWLEDGE command because KNOWLEDGE command is not used in templates but in pipeline head
        'INSTRUMENT', // <- Note: [⛱] -- || --
        'ACTION', // <- Note:     [⛱] -- || --

        // -----------------
        // Recommended (reversed) form:
        'PROMPT TEMPLATE',
        'SIMPLE TEMPLATE',
        'SCRIPT TEMPLATE',
        'DIALOG TEMPLATE',
        // <- [🅱]
        'SAMPLE TEMPLATE',
        'KNOWLEDGE TEMPLATE',
        'INSTRUMENT TEMPLATE',
        'ACTION TEMPLATE',

        // -----------------
        // Standard form:
        'TEMPLATE PROMPT',
        'TEMPLATE SIMPLE',
        'TEMPLATE SCRIPT',
        'TEMPLATE DIALOG',
        // <- [🅱]
        'SAMPLE TEMPLATE',
        'KNOWLEDGE TEMPLATE',
        'INSTRUMENT TEMPLATE',
        'ACTION TEMPLATE',
    ],

    // TODO: [♓️] order: -10 /* <- Note: Putting before other commands */

    /**
     * Parses the TEMPLATE command
     */
    parse(input: CommandParserInput): TemplateCommand {
        let { normalized } = input;

        normalized = normalized.split('EXAMPLE').join('SAMPLE');
        const templateTypes = TemplateTypes.filter((templateType) =>
            normalized.includes(templateType.split('_TEMPLATE').join('')),
        );

        if (templateTypes.length !== 1) {
            throw new ParseError(
                spaceTrim(
                    (template) => `
                        Unknown template type in TEMPLATE command

                        Supported template types are:
                        ${template(TemplateTypes.join(', '))}
                    `, // <- TODO: [🚞]
                ),
            );
        }

        const templateType = templateTypes[0]!;

        return {
            type: 'TEMPLATE',
            templateType,
        } satisfies TemplateCommand;
    },

    /**
     * Apply the TEMPLATE command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `templateJson`
     */
    $applyToTemplateJson(command: TemplateCommand, $templateJson: $TemplateJson, $pipelineJson: $PipelineJson): void {
        if ($templateJson.isTemplateTypeSet === true) {
            throw new ParseError(
                spaceTrim(`
                    Template type is already defined in the template.
                    It can be defined only once.
                `),
            );
        }

        $templateJson.isTemplateTypeSet = true;

        // TODO: [🍧] Rearrange better - but at bottom and unwrap from function
        const expectResultingParameterName = () => {
            if ($templateJson.resultingParameterName) {
                return;
            }

            throw new ParseError(` Template section must end with -> {parameterName}`);
        };

        if ($templateJson.content === undefined) {
            throw new UnexpectedError(
                `Content is missing in the templateJson - probbably commands are applied in wrong order`,
            );
        }

        if (command.templateType === 'SAMPLE') {
            expectResultingParameterName();

            const parameter = $pipelineJson.parameters.find(
                (param) => param.name === $templateJson.resultingParameterName,
            );
            if (parameter === undefined) {
                throw new ParseError(
                    `Can not find parameter {${$templateJson.resultingParameterName}} to assign sample value on it`,
                );
            }
            parameter.sampleValues = parameter.sampleValues || [];
            parameter.sampleValues.push($templateJson.content);

            $templateJson.isTemplate = false;
            return;
        }

        if (command.templateType === 'KNOWLEDGE') {
            knowledgeCommandParser.$applyToPipelineJson(
                {
                    type: 'KNOWLEDGE',
                    sourceContent: $templateJson.content, // <- TODO: [🐝] !!! Work with KNOWLEDGE which not referring to the source file or website, but its content itself
                },
                $pipelineJson,
            );

            $templateJson.isTemplate = false;
            return;
        }

        if (command.templateType === 'ACTION') {
            console.error(new NotYetImplementedError('Actions are not implemented yet'));

            $templateJson.isTemplate = false;
            return;
        }

        if (command.templateType === 'INSTRUMENT') {
            console.error(new NotYetImplementedError('Instruments are not implemented yet'));

            $templateJson.isTemplate = false;
            return;
        }

        expectResultingParameterName();
        ($templateJson as WritableDeep<TemplateJson>).templateType = command.templateType;

        $templateJson.isTemplate = true;
    },

    /**
     * Converts the TEMPLATE command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: TemplateCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the TEMPLATE command from the `TemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson($templateJson: $TemplateJson): Array<TemplateCommand> {
        keepUnused($templateJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};

/**
 * Note: [⛱] There are two types of KNOWLEDGE, ACTION and INSTRUMENT commands:
 * 1) There are commands `KNOWLEDGE`, `ACTION` and `INSTRUMENT` used in the pipeline head, they just define the knowledge, action or instrument as single line after the command
 *    - KNOWLEDGE Look at https://en.wikipedia.org/wiki/Artificial_intelligence
 * 2) `KNOWLEDGE TEMPLATE` which has short form `KNOWLEDGE` is used in the template, does not refer the line itself, but the content of the template
 *   - KNOWLEDGE TEMPLATE
 *
 *   ```
 *   Look at https://en.wikipedia.org/wiki/Artificial_intelligence
 *   ```
 */
