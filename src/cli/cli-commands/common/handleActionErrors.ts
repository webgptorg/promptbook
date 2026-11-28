import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { assertsError } from '../../../errors/assertsError';
import type { TODO_any } from '../../../utils/organization/TODO_any';

/**
 * Type describing action callback function.
 */
type actionCallbackFunction = Parameters<Program['action']>[0];

/**
 * Options controlling CLI process-exit behavior after one command action finishes.
 *
 * @private internal helper type for CLI commands
 */
type HandleActionErrorsOptions = {
    readonly isExitingOnSuccess?: boolean;
};

/**
 * Wraps action to handle error console logging and exit process with error code.
 *
 * @private internal helper function for CLI commands
 */
export function handleActionErrors(
    action: actionCallbackFunction,
    options: HandleActionErrorsOptions = {},
): actionCallbackFunction {
    const { isExitingOnSuccess = true } = options;

    return async (...args: Array<TODO_any>) => {
        try {
            await action(...args);

            if (isExitingOnSuccess) {
                return process.exit(0);
            }
        } catch (error) {
            assertsError(error);

            // console.error(colors.bgRed(error.name));
            console.error(colors.red(/* error.stack || */ error.message));

            return process.exit(1);
        }
    };
}
