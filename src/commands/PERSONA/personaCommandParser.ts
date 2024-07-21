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
        const { args } = input;

        let personaName = args.pop() || '';

        personaName = personaName.trim();

        if (personaName === '') {
            throw new SyntaxError(`You must set name for the persona`);
        }

        const personaDescription = args.join(' ').trim() || null;

        return {
            type: 'PERSONA',
            personaName,
            personaDescription,
        } satisfies PersonaCommand;
    },
};
