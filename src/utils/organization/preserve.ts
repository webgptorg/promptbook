import type { really_any } from './really_any';

/**
 * @private internal for `preserve`
 */
const _preserved: Array<really_any> = [];

/**
 * Does nothing, but preserves the function in the bundle
 * Compiler is tricked into thinking the function is used
 *
 * @param value any function to preserve
 * @returns nothing
 * @private within the repository
 */
export function $preserve(...value: Array<really_any>): void {
    _preserved.push(...value);
}

/**
 * DO NOT USE THIS FUNCTION
 * Only purpose of this function is to trick the compiler and javascript engine
 * that `_preserved` array can be used in the future and should not be garbage collected
 *
 * @private internal for `preserve`
 */
export function __DO_NOT_USE_getPreserved(): Array<really_any> {
    return _preserved;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
