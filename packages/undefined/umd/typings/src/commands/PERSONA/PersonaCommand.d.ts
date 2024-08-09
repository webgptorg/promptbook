import type { string_name } from '../../types/typeAliases';
import type { string_persona_description } from '../../types/typeAliases';
/**
 * Parsed PERSONA command
 *
 * @see ./personaCommandParser.ts for more details
 * @private within the commands folder
 */
export type PersonaCommand = {
    readonly type: 'PERSONA';
    readonly personaName: string_name;
    readonly personaDescription: string_persona_description | null;
};
