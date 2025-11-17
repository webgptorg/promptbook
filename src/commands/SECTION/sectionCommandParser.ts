import spaceTrim from 'spacetrim';
import type { WritableDeep } from 'type-fest';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import { SectionTypes } from '../../types/SectionType';
import type { string_markdown_text } from '../../types/typeAliases';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { keepUnused } from '../../utils/organization/keepUnused';
import { knowledgeCommandParser } from '../KNOWLEDGE/knowledgeCommandParser';
import type { $PipelineJson, $TaskJson, CommandParserInput, PipelineTaskCommandParser } from '../_common/types/CommandParser';
import type { SectionCommand } from './SectionCommand';

/**
 * Parses the section command
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
 */
export const sectionCommandParser: PipelineTaskCommandParser<SectionCommand> = {
    /**
     * Name of the command
     */
    name: 'SECTION',

    /**
     * Aliases for the SECTION command
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
     * Aliases for the SECTION command
     */
    deprecatedNames: ['TEMPLATE', 'BLOCK', 'EXECUTE'],

    /**
     * BOILERPLATE command can be used in:
     */
    isUsedInPipelineHead: false,
    isUsedInPipelineTask: true,

    /**
     * Description of the SECTION command
     */
    description: `Defines the purpose of the markdown section - if its a task and which type or something else`,

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/64',

    /**
     * Example usages of the SECTION command
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
        'PROMPT SECTION',
        'SIMPLE SECTION',
        'SCRIPT SECTION',
        'DIALOG SECTION',
        // <- [🅱]
        'EXAMPLE SECTION',
        'KNOWLEDGE SECTION',
        'INSTRUMENT SECTION',
        'ACTION SECTION',

        // -----------------
        // Standard form:
        'SECTION PROMPT',
        'SECTION SIMPLE',
        'SECTION SCRIPT',
        'SECTION DIALOG',
        // <- [🅱]
        'SECTION EXAMPLE',
        'SECTION KNOWLEDGE',
        'SECTION INSTRUMENT',
        'SECTION ACTION',
    ],

    // TODO: [♓️] order: -10 /* <- Note: Putting before other commands */

    /**
     * Parses the SECTION command
     */
    parse(input: CommandParserInput): SectionCommand {
        let { normalized } = input;

        normalized = normalized.split('SAMPLE').join('EXAMPLE');
        normalized = normalized.split('EXECUTE_').join('');
        normalized = normalized.split('DIALOGUE').join('DIALOG');

        const taskTypes = SectionTypes.filter((sectionType) =>
            normalized.includes(sectionType.split('_TASK').join('')),
        );

        if (taskTypes.length !== 1) {
            throw new ParseError(
                spaceTrim(
                    (block) => `
                        Unknown section type "${normalized}"

                        Supported section types are:
                        ${block(SectionTypes.join(', '))}
                    `, // <- TODO: [🚞]
                ),
            );
        }

        const taskType = taskTypes[0]!;

        return {
            type: 'SECTION',
            taskType,
        } satisfies SectionCommand;
    },

    /**
     * Apply the SECTION command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `taskJson`
     */
    $applyToTaskJson(command: SectionCommand, $taskJson: $TaskJson, $pipelineJson: $PipelineJson): $side_effect {
        if ($taskJson.isSectionTypeSet === true) {
            throw new ParseError(
                spaceTrim(`
                    Section type is already defined in the section.
                    It can be defined only once.
                `),
            );
        }

        $taskJson.isSectionTypeSet = true;

        // TODO: [🍧][💩] Rearrange better - but at bottom and unwrap from function
        const expectResultingParameterName = () => {
            if ($taskJson.resultingParameterName) {
                return;
            }

            throw new ParseError(`Task section and example section must end with return statement -> {parameterName}`);
        };

        if ($taskJson.content === undefined) {
            throw new UnexpectedError(
                `Content is missing in the taskJson - probably commands are applied in wrong order`,
            );
        }

        if (command.taskType === 'EXAMPLE') {
            expectResultingParameterName();

            const parameter = $pipelineJson.parameters.find((param) => param.name === $taskJson.resultingParameterName);
            if (parameter === undefined) {
                // TODO: !!6 Change to logic error for higher level abstraction of chatbot to work
                throw new ParseError(
                    `Parameter \`{${$taskJson.resultingParameterName}}\` is not defined so can not define example value of it`,
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
                    knowledgeSourceContent: $taskJson.content, // <- TODO: [🐝][main] !!3 Work with KNOWLEDGE which not referring to the source file or website, but its content itself
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
     * Converts the SECTION command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: SectionCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the SECTION command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<SectionCommand> {
        keepUnused($taskJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};

/**
 * Note: [⛱] There are two types of KNOWLEDGE, ACTION and INSTRUMENT commands:
 * 1) There are commands `KNOWLEDGE`, `ACTION` and `INSTRUMENT` used in the pipeline head, they just define the knowledge, action or instrument as single line after the command
 *    - KNOWLEDGE Look at https://en.wikipedia.org/wiki/Artificial_intelligence
 * 2) `KNOWLEDGE SECTION` which has short form `KNOWLEDGE` is used in the sectiom, does not refer the line itself, but the content of the section block
 *   - KNOWLEDGE SECTION
 *
 *   ```
 *   Look at https://en.wikipedia.org/wiki/Artificial_intelligence
 *   ```
 */
