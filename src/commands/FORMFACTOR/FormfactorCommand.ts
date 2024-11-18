/**
 * Parsed FORMFACTOR command
 *
 * @see ./formfactorCommandParser.ts for more details
 * @private within the commands folder
 */
export type FormfactorCommand = {
    readonly type: 'FORMFACTOR';
    readonly value: string;
};
