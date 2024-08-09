import type { string_name } from '../../types/typeAliases';
/**
 * Parsed POSTPROCESS command
 *
 * @see ./postprocessCommandParser.ts for more details
 * @private within the commands folder
 */
export type PostprocessCommand = {
    readonly type: 'POSTPROCESS';
    readonly functionName: string_name;
};
