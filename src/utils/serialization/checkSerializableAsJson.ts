import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../errors/assertsError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { string_name } from '../../types/string_name';
import type { really_unknown } from '../organization/really_unknown';

/**
 * Options for the `checkSerializableAsJson` function
 */
export type CheckSerializableAsJsonOptions = {
    /**
     * Value to be checked
     */
    value: really_unknown;

    /**
     * Semantic name of the value for debugging purposes
     */
    name?: string_name;

    /**
     * Message alongside the value for debugging purposes
     */
    message?: string;
};

/**
 * Shared recursion context for nested serialization checks.
 *
 * @private function of `checkSerializableAsJson`
 */
type CheckSerializableAsJsonContext = Pick<CheckSerializableAsJsonOptions, 'message' | 'name'>;

/**
 * Checks if the value is [🚉] serializable as JSON
 * If not, throws an UnexpectedError with a rich error message and tracking
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
 * @throws UnexpectedError if the value is not serializable as JSON
 *
 * @public exported from `@promptbook/utils`
 */
export function checkSerializableAsJson(options: CheckSerializableAsJsonOptions): void {
    checkSerializableValue(options);
}

// TODO: Can be return type more type-safe? like `asserts options.value is JsonValue`
// TODO: [🧠][main] !!3 In-memory cache of same values to prevent multiple checks
// Note: [🐠] This is how `checkSerializableAsJson` + `isSerializableAsJson` together can just retun true/false or rich error message

/**
 * Checks one value and dispatches to the appropriate specialized validator.
 *
 * @private function of `checkSerializableAsJson`
 */
function checkSerializableValue(options: CheckSerializableAsJsonOptions): void {
    const { value } = options;

    if (isSerializablePrimitive(value)) {
        return;
    }

    if (value === undefined) {
        throw new UnexpectedError(`${options.name} is undefined`);
    }

    if (typeof value === 'symbol') {
        throw new UnexpectedError(`${options.name} is symbol`);
    }

    if (typeof value === 'function') {
        throw new UnexpectedError(`${options.name} is function`);
    }

    if (Array.isArray(value)) {
        checkSerializableArray(options, value);
        return;
    }

    if (value !== null && typeof value === 'object') {
        checkSerializableObject(options, value);
        return;
    }

    throwUnknownTypeError(options);
}

/**
 * Checks the primitive values that are directly JSON serializable.
 *
 * @private function of `checkSerializableAsJson`
 */
function isSerializablePrimitive(value: really_unknown): boolean {
    return value === null || typeof value === 'boolean' || (typeof value === 'number' && !isNaN(value)) || typeof value === 'string';
}

/**
 * Recursively checks JSON array items.
 *
 * @private function of `checkSerializableAsJson`
 */
function checkSerializableArray(
    context: CheckSerializableAsJsonContext,
    arrayValue: ReadonlyArray<really_unknown>,
): void {
    for (let index = 0; index < arrayValue.length; index++) {
        checkSerializableAsJson({
            ...context,
            name: `${context.name}[${index}]`,
            value: arrayValue[index],
        });
    }
}

/**
 * Checks object-like values and dispatches special unsupported built-ins.
 *
 * @private function of `checkSerializableAsJson`
 */
function checkSerializableObject(context: CheckSerializableAsJsonOptions, objectValue: object): void {
    checkUnsupportedObjectType(context, objectValue);
    checkSerializableObjectEntries(context, objectValue);
    assertJsonStringificationSucceeds(context, objectValue);
}

/**
 * Rejects built-in objects that must be converted before JSON serialization.
 *
 * @private function of `checkSerializableAsJson`
 */
function checkUnsupportedObjectType(context: CheckSerializableAsJsonContext, objectValue: object): void {
    if (objectValue instanceof Date) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    \`${context.name}\` is Date

                    Use \`string_date_iso8601\` instead

                    Additional message for \`${context.name}\`:
                    ${block(context.message || '(nothing)')}
                `,
            ),
        );
    }

    if (objectValue instanceof Map) {
        throw new UnexpectedError(`${context.name} is Map`);
    }

    if (objectValue instanceof Set) {
        throw new UnexpectedError(`${context.name} is Set`);
    }

    if (objectValue instanceof RegExp) {
        throw new UnexpectedError(`${context.name} is RegExp`);
    }

    if (objectValue instanceof Error) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    \`${context.name}\` is unserialized Error

                    Use function \`serializeError\`

                    Additional message for \`${context.name}\`:
                    ${block(context.message || '(nothing)')}

                `,
            ),
        );
    }
}

/**
 * Recursively checks object properties while preserving omitted `undefined` keys.
 *
 * @private function of `checkSerializableAsJson`
 */
function checkSerializableObjectEntries(context: CheckSerializableAsJsonContext, objectValue: object): void {
    for (const [subName, subValue] of Object.entries(objectValue)) {
        if (subValue === undefined) {
            // Note: undefined in object is serializable - it is just omitted
            continue;
        }

        checkSerializableAsJson({
            ...context,
            name: `${context.name}.${subName}`,
            value: subValue,
        });
    }
}

/**
 * Uses `JSON.stringify` as the final guard for cases like circular references.
 *
 * @private function of `checkSerializableAsJson`
 */
function assertJsonStringificationSucceeds(context: CheckSerializableAsJsonContext, objectValue: object): void {
    try {
        JSON.stringify(objectValue); // <- TODO: [0]
    } catch (error) {
        assertsError(error);

        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    \`${context.name}\` is not serializable

                    ${block((error as Error).stack || (error as Error).message)}

                    Additional message for \`${context.name}\`:
                    ${block(context.message || '(nothing)')}
                `,
            ),
        );
    }

    /*
    TODO: [0] Is there some more elegant way to check circular references?
    const seen = new Set();
    const stack = [{ value }];
    while (stack.length > 0) {
        const { value } = stack.pop()!;
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                throw new UnexpectedError(`${name} has circular reference`);
            }
            seen.add(value);
            if (Array.isArray(value)) {
                stack.push(...value.map((value) => ({ value })));
            } else {
                stack.push(...Object.values(value).map((value) => ({ value })));
            }
        }
    }
    */
}

/**
 * Throws the fallback error for unsupported value types like `bigint` and `NaN`.
 *
 * @private function of `checkSerializableAsJson`
 */
function throwUnknownTypeError(context: CheckSerializableAsJsonContext): never {
    throw new UnexpectedError(
        spaceTrim(
            (block) => `
                \`${context.name}\` is unknown type

                Additional message for \`${context.name}\`:
                ${block(context.message || '(nothing)')}
            `,
        ),
    );
}
