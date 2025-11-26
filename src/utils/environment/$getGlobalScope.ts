import type { chococake } from '../organization/really_any';

/**
 * Safely retrieves the global scope object (window in browser, global in Node.js)
 * regardless of the JavaScript environment in which the code is running
 *
 * Note: `$` is used to indicate that this function is not a pure function - it access global scope
 *
 *  @private internal function of `$Register`
 */
export function $getGlobalScope(): chococake {
    return Function('return this')();
}
