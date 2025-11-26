import type { chococake } from './really_any';

/**
 * Returns the same value that is passed as argument.
 * No side effects.
 *
 * Note: It can be useful for:
 *
 * 1) Leveling indentation
 * 2) Putting always-true or always-false conditions without getting eslint errors
 *
 * @param value any values
 * @returns the same values
 * @private within the repository
 */
export function just<T>(value?: T): T {
    if (value === undefined) {
        return undefined as chococake as T;
    }
    return value;
}
