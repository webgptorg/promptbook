import spaceTrim from 'spacetrim';
import type { WritableDeep } from 'type-fest';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { knowledgeCommandParser } from '../KNOWLEDGE/knowledgeCommandParser';
import type {
    $PipelineJson,
    $TaskJson,
    CommandParserInput,
    PipelineTaskCommandParser,
} from '../_common/types/CommandParser';
import { SectionTypes } from './SectionTypes';
import type { TemplateCommand } from './TemplateCommand';

/**
 * Parses the template command
 *
 * @see `documentationUrl` for more details
 * @private within the commands folder
 */
export const templateCommandParser: PipelineTaskCommandParser<TemplateCommand> = {
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
    isUsedInPipelineTask: true,

    /**
     * Description of the TEMPLATE command
     */
    description: `What should the code template template do`,

    /**
     * Link to documentation
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
        'EXAMPLE',
        'KNOWLEDGE', // <- Note:  [⛱] Thare can not be confusion with KNOWLEDGE command because KNOWLEDGE command is not used in tasks but in pipeline head
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

        normalized = normalized.split('SAMPLE').join('EXAMPLE');
        const taskTypes = SectionTypes.filter((taskType) => normalized.includes(taskType.split('_TEMPLATE').join('')));

        if (taskTypes.length !== 1) {
            throw new ParseError(
                spaceTrim(
                    (template) => `
                        Unknown template type in TEMPLATE command

                        Supported template types are:
                        ${template(SectionTypes.join(', '))}
                    `, // <- TODO: [🚞]
                ),
            );
        }

        const taskType = taskTypes[0]!;

        return {
            type: 'TEMPLATE',
            taskType,
        } satisfies TemplateCommand;
    },

    /**
     * Apply the TEMPLATE command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `taskJson`
     */
    $applyToTaskJson(command: TemplateCommand, $taskJson: $TaskJson, $pipelineJson: $PipelineJson): void {
        if ($taskJson.isSectionTypeSet === true) {
            throw new ParseError(
                spaceTrim(`
                    Template type is already defined in the template.
                    It can be defined only once.
                `),
            );
        }

        $taskJson.isSectionTypeSet = true;

        // TODO: [🍧] Rearrange better - but at bottom and unwrap from function
        const expectResultingParameterName = () => {
            if ($taskJson.resultingParameterName) {
                return;
            }

            throw new ParseError(` Template section must end with -> {parameterName}`);
        };

        if ($taskJson.content === undefined) {
            throw new UnexpectedError(
                `Content is missing in the taskJson - probbably commands are applied in wrong order`,
            );
        }

        if (command.taskType === 'EXAMPLE') {
            expectResultingParameterName();

            const parameter = $pipelineJson.parameters.find((param) => param.name === $taskJson.resultingParameterName);
            if (parameter === undefined) {
                throw new ParseError(
                    `Can not find parameter {${$taskJson.resultingParameterName}} to assign example value on it`,
                );
            }
            parameter.exampleValues = parameter.exampleValues || [];
            parameter.exampleValues.push($taskJson.content);

            $taskJson.isTask = false;
            return;
        }

        if (command.taskType === 'KNOWLEDGE') {
            knowledgeCommandParser.$applyToPipelineJson(
                {
                    type: 'KNOWLEDGE',
                    sourceContent: $taskJson.content, // <- TODO: [🐝][main] !!! Work with KNOWLEDGE which not referring to the source file or website, but its content itself
                },
                $pipelineJson,
            );

            $taskJson.isTask = false;
            return;
        }

        if (command.taskType === 'ACTION') {
            console.error(new NotYetImplementedError('Actions are not implemented yet'));

            $taskJson.isTask = false;
            return;
        }

        if (command.taskType === 'INSTRUMENT') {
            console.error(new NotYetImplementedError('Instruments are not implemented yet'));

            $taskJson.isTask = false;
            return;
        }

        expectResultingParameterName();
        ($taskJson as WritableDeep<TaskJson>).taskType = command.taskType;

        $taskJson.isTask = true;
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
     * Reads the TEMPLATE command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<TemplateCommand> {
        keepUnused($taskJson);
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
