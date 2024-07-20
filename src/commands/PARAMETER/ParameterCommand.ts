/**
 * Parsed PARAMETER command
 *
 * @see ./parameterCommandParser.ts for more details
 * @private within the commands folder
 */
export type ParameterCommand = {
    readonly type: 'PARAMETER';
    readonly value: string;
};
