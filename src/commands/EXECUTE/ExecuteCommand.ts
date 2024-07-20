import type { ExecutionType } from './ExecutionTypes';

/**
 * Parsed EXECUTE command
 *
 * @see ./executeCommandParser.ts for more details
 * @private within the commands folder
 */
export type ExecuteCommand = {
    readonly type: 'EXECUTE';
    readonly executionType: ExecutionType;
};
