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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return undefined as any as T;
    }
    return value;
}
