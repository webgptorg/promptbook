import { string_name, string_persona_description } from '../../types/typeAliases';

/**
 * Parsed PERSONA command
 *
 * @see ./personaCommandParser.ts for more details
 * @private within the commands folder
 */
export type PersonaCommand = {
    readonly type: 'PERSONA';
    personaName: string_name;
    personaDescription: string_persona_description | null;
};
