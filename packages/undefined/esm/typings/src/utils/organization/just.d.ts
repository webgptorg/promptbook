/**
 * Returns the same value that is passed as argument.
 * No side effects.
 *
 * Note: It can be usefull for:
 *
 * 1) Leveling indentation
 * 2) Putting always-true or always-false conditions without getting eslint errors
 *
 * @param value any values
 * @returns the same values
 * @private within the repository
 */
export declare function just<T>(value?: T): T;
