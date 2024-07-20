/**
 * Parsed JOKER command
 *
 * @see ./jokerCommandParser.ts for more details
 * @private within the commands folder
 */
export type JokerCommand = {
    readonly type: 'JOKER';
    readonly value: string;
};
