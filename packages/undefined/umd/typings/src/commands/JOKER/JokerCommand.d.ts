import type { string_name } from '../../types/typeAliases';
/**
 * Parsed JOKER command
 *
 * @see ./jokerCommandParser.ts for more details
 * @private within the commands folder
 */
export type JokerCommand = {
    readonly type: 'JOKER';
    readonly parameterName: string_name;
};
