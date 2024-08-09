import type { really_any } from './really_any';
/**
 * Just says that the variable is not used but should be kept
 * No side effects.
 *
 * Note: It can be usefull for:
 *
 * 1) Suppressing eager optimization of unused imports
 * 2) Suppressing eslint errors of unused variables in the tests
 * 3) Keeping the type of the variable for type testing
 *
 * @param value any values
 * @returns void
 * @private within the repository
 */
export declare function keepUnused<TTypeToKeep1 = really_any, TTypeToKeep2 = really_any, TTypeToKeep3 = really_any>(...valuesToKeep: Array<really_any>): void;
