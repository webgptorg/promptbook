/**
 * Parsed EXPECT command
 *
 * @see ./expectCommandParser.ts for more details
 * @private within the commands folder
 */
export type ExpectCommand = {
    readonly type: 'EXPECT';
    readonly value: string;
};
