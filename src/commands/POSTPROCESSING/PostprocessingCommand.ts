import type { string_name } from '../../types/typeAliases';

/**
 * Parsed POSTPROCESSING command
 *
 * @see ./postprocessingCommandParser.ts for more details
 * @private within the commands folder
 */
export type PostprocessingCommand = {
    readonly type: 'POSTPROCESS';
    readonly functionName: string_name;
};
