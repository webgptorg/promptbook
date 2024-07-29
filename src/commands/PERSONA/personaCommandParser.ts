import spaceTrim from 'spacetrim';
import type { WritableDeep } from 'type-fest';
import { ParsingError } from '../../errors/ParsingError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { CommandParser, CommandParserInput } from '../_common/types/CommandParser';
import type { PersonaCommand } from './PersonaCommand';

/**
 * Parses the persona command
 *
 * @see ./PERSONA-README.md for more details
 * @private within the commands folder
 */
export const personaCommandParser: CommandParser<PersonaCommand> = {
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
    usagePlaces: ['PIPELINE_HEAD', 'PIPELINE_TEMPLATE'],

    /**
     * Description of the PERSONA command
     */
    description: `Persona command is used to specify who the system is, it will be transformed into system message, top_t,...`,

    /**
     * Link to discussion
     */
    discussionUrl: 'https://github.com/webgptorg/promptbook/discussions/22',

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
            throw new ParsingError(`You must set name for the persona`);
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
     * Note: Prototype of [🍧] (remove this comment after full implementation)
     */
    applyToPipelineJson(pipelineJson: WritableDeep<PipelineJson>, personaCommand: PersonaCommand): void {
        const { personaName, personaDescription } = personaCommand;

        const persona = pipelineJson.personas.find((persona) => persona.name === personaName);

        if (persona === undefined) {
            pipelineJson.personas.push({
                name: personaName,
                description: personaDescription || '',
            });
            return;
        }

        if (persona.description === personaDescription) {
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
            // <- TODO: [🚞]
            // <- TODO: [🧠] What is the propper way of theese `pipelineStringToJson` warnings
        );

        persona.description += '\n\n' + personaDescription;
    },
};
