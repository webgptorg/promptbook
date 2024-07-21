/**
 * Parsed PERSONA command
 *
 * @see ./personaCommandParser.ts for more details
 * @private within the commands folder
 */
export type PersonaCommand = {
    readonly type: 'PERSONA';
    personaName: string;
    personaDescription: string | null;
};
