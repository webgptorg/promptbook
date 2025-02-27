import type { string_name } from "../../types/typeAliases";

/**
 * Parsed JOKER command
 *
 * @see ./jokerCommandParser.ts for more details
 * @public exported from `@promptbook/editable`
 */
export type JokerCommand = {
	readonly type: "JOKER";
	readonly parameterName: string_name;
};
