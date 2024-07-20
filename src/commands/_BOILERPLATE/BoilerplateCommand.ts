/**
 * Parsed BOILERPLATE command
 *
 * @see ./boilerplateCommandParser.ts for more details
 * @private within the commands folder
 */
export type BoilerplateCommand = {
    readonly type: 'BOILERPLATE';
    readonly value: string;
};
