import type { really_any } from '../types/typeAliases';

/**
 * Returns the same value that is passed as argument.
 * No side effects.
 *
 * Note: It can be usefull for leveling indentation
 *
 * @param value any values
 * @returns the same values
 */
export function just<T>(value?: T): T {
    if (value === undefined) {
        return undefined as really_any as T;
    }
    return value;
}
