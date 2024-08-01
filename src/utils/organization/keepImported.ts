import type { really_any } from './really_any';

/**
 * Just says that the variable is not used but should be kept
 * No side effects.
 *
 * Note: It can be usefull suppressing eager optimization of unused imports
 *
 * @param value any values
 * @returns void
 * @private within the repository
 */
export function keepImported(...value: Array<really_any>): void {
    // Note: Do nothing
    value;
}
