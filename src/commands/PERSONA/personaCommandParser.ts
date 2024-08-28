import spaceTrim from 'spacetrim';
import type { WritableDeep } from 'type-fest';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { ParsingError } from '../../errors/ParsingError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import { string_markdown_text } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
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
    isUsedInPipelineHead: true,
    isUsedInPipelineTemplate: true,

    /**
     * Description of the PERSONA command
     */
    description: `Persona command is used to specify who the system is, it will be transformed into system message, top_t,...`,

    /**
     * Link to discussion
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
     * Apply the PERSONA command to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson(command: PersonaCommand, pipelineJson: WritableDeep<PipelineJson>): void {
        $applyToTemplateJson(command, null, pipelineJson);
    },

    $applyToTemplateJson,

    /**
     * Converts the PERSONA command back to string
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    stringify(command: PersonaCommand): string_markdown_text {
        keepUnused(command);
        return `- !!!!!!`;
    },

    /**
     * Reads the PERSONA command from the `PipelineJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromPipelineJson(pipelineJson: PipelineJson): Array<PersonaCommand> {
        keepUnused(pipelineJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },

    /**
     * Reads the PERSONA command from the `PromptTemplateJson`
     *
     * Note: This is used in `pipelineJsonToString` utility
     */
    takeFromTemplateJson(templateJson: WritableDeep<PromptTemplateJson>): Array<PersonaCommand> {
        keepUnused(templateJson);
        throw new NotYetImplementedError(`Not implemented yet !!!!!!`);
    },
};

/**
 * Apply the PERSONA command to the `pipelineJson`
 *
 * Note: `$` is used to indicate that this function mutates given `templateJson`
 */
function $applyToTemplateJson(
    command: PersonaCommand,
    templateJson: WritableDeep<PromptTemplateJson> | null,
    pipelineJson: WritableDeep<PipelineJson>,
): void {
    const { personaName, personaDescription } = command;

    if (templateJson !== null) {
        if (templateJson.blockType !== 'PROMPT_TEMPLATE') {
            throw new ParsingError(`PERSONA command can be used only in PROMPT_TEMPLATE block`);
        }

        templateJson.personaName = personaName;
    }

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
        // <- TODO: [🚞]
        // <- TODO: [🧠] What is the propper way of theese `pipelineStringToJson` warnings
    );

    persona.description += spaceTrim('\n\n' + personaDescription);
}
