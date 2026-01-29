import spaceTrim from 'spacetrim';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParseError } from '../../errors/ParseError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_markdown_text } from '../../types/typeAliases';
import type { $side_effect } from '../../utils/organization/$side_effect';
import { keepUnused } from '../../utils/organization/keepUnused';
import type {
    $PipelineJson,
    $TaskJson,
    CommandParserInput,
    PipelineBothCommandParser,
} from '../_common/types/CommandParser';
import type { PersonaCommand } from './PersonaCommand';

/**
 * Parses the persona command
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/editable`
 */
export const personaCommandParser: PipelineBothCommandParser<PersonaCommand> = {
    /**
     * Name of the command
     */
    name: 'PERSONA',

    /**
     * Aliases for the PERSONA command
     */
    aliasNames: ['PERSON'],

    /**
     * PERSONA command can be used in:
     */
    isUsedInPipelineHead: true,
    isUsedInPipelineTask: true,

    /**
     * Description of the PERSONA command
     */
    description: `Persona command is used to specify who the system is, it will be transformed into system message, top_t,...`,

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/22',

    /**
     * Example usages of the PERSONA command
     */
    examples: ['PERSONA Jane, skilled copywriter', 'PERSONA Joe, male 28 years old, programmer'],

    /**
     * Parses the PERSONA command
     */
    parse(input: CommandParserInput): PersonaCommand {
        const { rawArgs } = input;

        const [personaNameRaw, personaDescriptionRaw] = rawArgs.split(/[,;:]/, 2);

        const personaName = (personaNameRaw || '').trim();

        if (personaName === '') {
            throw new ParseError(`You must set name for the persona`);
        }

        let personaDescription: string | null = (personaDescriptionRaw || '').trim();

        if (personaDescription === '') {
            personaDescription = null;
        }

        return {
            type: 'PERSONA',
            personaName,
            personaDescription,
        } satisfies PersonaCommand;
    },

    /**
     * Apply the PERSONA command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: PersonaCommand, $pipelineJson: $PipelineJson): $side_effect {
        $applyToTaskJson(command, null, $pipelineJson);
    },

    $applyToTaskJson,

    /**
     * Converts the PERSONA command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: PersonaCommand): string_markdown_text {
        keepUnused(command);
        return `---`; // <- TODO: [🛋] Implement
    },

    /**
     * Reads the PERSONA command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): ReadonlyArray<PersonaCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },

    /**
     * Reads the PERSONA command from the `TaskJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTaskJson($taskJson: $TaskJson): ReadonlyArray<PersonaCommand> {
        keepUnused($taskJson);
        throw new NotYetImplementedError(`[🛋] Not implemented yet`); // <- TODO: [🛋] Implement
    },
};

/**
 * Apply the PERSONA command to the `pipelineJson`
 *
 * Note: `$` is used to indicate that this function mutates given `taskJson`
 */
function $applyToTaskJson(
    command: PersonaCommand,
    $taskJson: $TaskJson | null,
    $pipelineJson: $PipelineJson,
): $side_effect {
    const { personaName, personaDescription } = command;

    if ($taskJson !== null) {
        if ($taskJson.taskType !== 'PROMPT_TASK') {
            throw new ParseError(`PERSONA command can be used only in PROMPT_TASK block`);
        }

        $taskJson.personaName = personaName;
    } else {
        // TODO: [🛳] Default PERSONA for the pipeline `defaultPersonaName` (same as `defaultModelRequirements`)
    }

    const persona = $pipelineJson.personas.find((persona) => persona.name === personaName);

    if (persona === undefined) {
        $pipelineJson.personas.push({
            name: personaName,
            description: personaDescription || '',
        });
        return;
    }

    if (persona.description === personaDescription) {
        return;
    }

    if (personaDescription === null) {
        return;
    }

    if (persona.description === '') {
        persona.description = personaDescription;
        return;
    }

    console.warn(
        spaceTrim(`

            Persona "${personaName}" is defined multiple times with different description:

            First definition:
            ${persona.description}

            Second definition:
            ${personaDescription}

        `),
        // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks
        // <- TODO: [🚞]
        // <- TODO: [🧠] What is the proper way of these `compilePipeline` warnings
    );

    persona.description += spaceTrim('\n\n' + personaDescription);
}
