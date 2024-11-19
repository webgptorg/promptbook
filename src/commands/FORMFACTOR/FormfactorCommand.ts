import { string_formfactor_name } from '../../formfactors/_common/string_formfactor_name';

/**
 * Parsed FORMFACTOR command
 *
 * @see ./formfactorCommandParser.ts for more details
 * @private within the commands folder
 */
export type FormfactorCommand = {
    readonly type: 'FORMFACTOR';
    readonly formfactorName: string_formfactor_name;
};
