import type { string_formfactor_name } from "../../formfactors/_common/string_formfactor_name";

/**
 * Parsed FORMFACTOR command
 *
 * @see ./formfactorCommandParser.ts for more details
 * @public exported from `@promptbook/editable`
 */
export type FormfactorCommand = {
	readonly type: "FORMFACTOR";
	readonly formfactorName: string_formfactor_name;
};
