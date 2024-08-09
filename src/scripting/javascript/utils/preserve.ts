import { forTime } from 'waitasecond';
import type { really_any } from '../../../utils/organization/really_any';

/**
 * Does nothing, but preserves the function in the bundle
 * Compiler is tricked into thinking the function is used
 *
 * @param value any function to preserve
 * @returns nothing
 * @private internal function of `JavascriptExecutionTools` and `JavascriptEvalExecutionTools`
 */
export function preserve(func: (...params: Array<really_any>) => unknown): void {
    // Note: NOT calling the function

    (async () => {
        // TODO: Change to `await forEver` or something better
        await forTime(100000000);

        // [1]
        try {
            await func();
        } finally {
            // do nothing
        }
    })();
}

/**
 * TODO: !! [1] This maybe does memory leak
 */
