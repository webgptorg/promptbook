import type { really_any } from './really_any';

/**
 * Just says that the variable is not used
 * No side effects.
 *
 * Note: It can be usefull suppressing eslint errors of unused variables in the tests
 *
 * @param value any values
 * @returns void
 */
export function notUsing(...value: Array<really_any>): void {
    // Note: Do nothing
    value;
}
