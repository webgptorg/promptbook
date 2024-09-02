import { ForeachJson } from './ForeachJson';

/**
 * Parsed FOREACH command <- Write [🍭] !!!!!!
 *
 * @see ./foreachCommandParser.ts for more details
 * @private within the commands folder
 */
export type ForeachCommand = {
    readonly type: 'FOREACH';
} & ForeachJson;
