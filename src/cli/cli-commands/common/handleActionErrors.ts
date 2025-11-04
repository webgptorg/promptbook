import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import colors from 'yoctocolors';
import { assertsError } from '../../../errors/assertsError';
import type { TODO_any } from '../../../utils/organization/TODO_any';

type actionCallbackFunction = Parameters<Program['action']>[0];

/**
 * Wraps action to handle error console logging and exit process with error code
 *
 * @param action Action to be wrapped in error handling
 * @returns Wrapped action
 * @private internal helper function for CLI commands
 */
export function handleActionErrors(action: actionCallbackFunction): actionCallbackFunction {
    return async (...args: Array<TODO_any>) => {
        try {
            await action(...args);
            return process.exit(0);
        } catch (error) {
            assertsError(error);

            // console.error(colors.bgRed(error.name));
            console.error(colors.red(/* error.stack || */ error.message));

            return process.exit(1);
        }
    };
}
