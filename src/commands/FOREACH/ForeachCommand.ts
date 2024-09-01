import { string_parameter_name } from '../../types/typeAliases';
import { TODO_string } from '../../utils/organization/TODO_string';

/**
 * Parsed FOREACH command <- Write [🍭] !!!!!!
 *
 * @see ./foreachCommandParser.ts for more details
 * @private within the commands folder
 */
export type ForeachCommand = {
    readonly type: 'FOREACH';
    formatName: TODO_string; // <- !!!!!!
    cellName: TODO_string; // <- !!!!!!
    parameterName: string_parameter_name;
    // <- TODO: [🍭] !!!!!!
};
