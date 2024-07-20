/**
 * Parsed SAMPLE command
 *
 * @see ./sampleCommandParser.ts for more details
 * @private within the commands folder
 */
export type SampleCommand = {
    readonly type: 'SAMPLE';
    readonly value: string;
};
