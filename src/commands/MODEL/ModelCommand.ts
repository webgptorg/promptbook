/**
 * Parsed MODEL command
 *
 * @see ./modelCommandParser.ts for more details
 * @private within the commands folder
 */
export type ModelCommand = {
    readonly type: 'MODEL';
    readonly value: string;
};
