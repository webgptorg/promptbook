import type { really_any } from './really_any';

/**
 * Just marks a place of place where should be something implemented
 * No side effects.
 *
 * Note: It can be useful suppressing eslint errors of unused variables
 *
 * @param value any values
 * @returns void
 * @private within the repository
 */
export function TODO_USE(...value: ReadonlyArray<really_any>): void {
    // Note: Do nothing
    value;
}
