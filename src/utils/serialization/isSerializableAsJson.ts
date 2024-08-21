/**
 * Tests if the value is [🚉] serializable as JSON
 *
 * - Almost all primitives are serializable BUT:
 * - `undefined` is not serializable
 * - `NaN` is not serializable
 * - Objects and arrays are serializable if all their properties are serializable
 * - Functions are not serializable
 * - Circular references are not serializable
 * - `Date` objects are not serializable
 * - `Map` and `Set` objects are not serializable
 * - `RegExp` objects are not serializable
 * - `Error` objects are not serializable
 * - `Symbol` objects are not serializable
 * - And much more...
 *
 *
 * @public exported from `@promptbook/utils`
 */
export function isSerializableAsJson(value: unknown): boolean {
    if (value === undefined) {
        return false;
    } else if (value === null) {
        return true;
    } else if (typeof value === 'boolean') {
        return true;
    } else if (typeof value === 'number' && !isNaN(value)) {
        return true;
    } else if (typeof value === 'string') {
        return true;
    } else if (typeof value === 'symbol') {
        return false;
    } else if (typeof value === 'function') {
        return false;
    } else if (typeof value === 'object' && Array.isArray(value)) {
        return value.every(isSerializableAsJson);
    } else if (typeof value === 'object') {
        if (value instanceof Date) {
            return false;
        } else if (value instanceof Map) {
            return false;
        } else if (value instanceof Set) {
            return false;
        } else if (value instanceof RegExp) {
            return false;
        } else if (value instanceof Error) {
            return false;
        } else {
            const seen = new Set();
            const stack = [{ value }];
            while (stack.length > 0) {
                const { value } = stack.pop()!;
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return false;
                    }
                    seen.add(value);
                    if (Array.isArray(value)) {
                        stack.push(...value.map((value) => ({ value })));
                    } else {
                        stack.push(...Object.values(value).map((value) => ({ value })));
                    }
                }
            }
            return true;
        }
    } else {
        return false;
    }
}

/**
 * TODO: [🧠] !!! In-memory cache of same values to prevent multiple checks
 * TODO: [🧠][💺] Can be done this on type-level?
 */
