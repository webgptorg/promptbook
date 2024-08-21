import { checkSerializableAsJson } from './checkSerializableAsJson';

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
    try {
        checkSerializableAsJson('', value);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * TODO: [🧠] !!! In-memory cache of same values to prevent multiple checks
 * TODO: [🧠][💺] Can be done this on type-level?
 */
