/**
 * Parsed POSTPROCESSING command
 *
 * @see ./postprocessingCommandParser.ts for more details
 * @private within the commands folder
 */
export type PostprocessingCommand = {
    readonly type: 'POSTPROCESSING';
    readonly value: string;
};
