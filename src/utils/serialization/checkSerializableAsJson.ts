import spaceTrim from 'spacetrim';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { string_name } from '../../types/typeAliases';

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
 * @public exported from `@promptbook/utils`
 */
export function checkSerializableAsJson(name: string_name, value: unknown): void {
    if (value === undefined) {
        throw new UnexpectedError(`${name} is undefined`);
    } else if (value === null) {
        return;
    } else if (typeof value === 'boolean') {
        return;
    } else if (typeof value === 'number' && !isNaN(value)) {
        return;
    } else if (typeof value === 'string') {
        return;
    } else if (typeof value === 'symbol') {
        throw new UnexpectedError(`${name} is symbol`);
    } else if (typeof value === 'function') {
        throw new UnexpectedError(`${name} is function`);
    } else if (typeof value === 'object' && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            checkSerializableAsJson(`${name}[${i}]`, value[i]);
        }
    } else if (typeof value === 'object') {
        if (value instanceof Date) {
            throw new UnexpectedError(
                spaceTrim(`
                    ${name} is Date

                    Use \`string_date_iso8601\` instead
                `),
            );
        } else if (value instanceof Map) {
            throw new UnexpectedError(`${name} is Map`);
        } else if (value instanceof Set) {
            throw new UnexpectedError(`${name} is Set`);
        } else if (value instanceof RegExp) {
            throw new UnexpectedError(`${name} is RegExp`);
        } else if (value instanceof Error) {
            throw new UnexpectedError(
                spaceTrim(`
                    ${name} is unserialized Error

                    Use function \`serializeError\`
                `),
            );
        } else {
            for (const [subName, subValue] of Object.entries(value)) {
                if (subValue === undefined) {
                    // Note: undefined in object is serializable - it is just omited
                    continue;
                }
                checkSerializableAsJson(`${name}.${subName}`, subValue);
            }

            try {
                JSON.stringify(value); // <- TODO: [0]
            } catch (error) {
                if (!(error instanceof Error)) {
                    throw error;
                }

                throw new UnexpectedError(
                    spaceTrim(
                        (block) => `
                            ${name} is not serializable

                            ${block((error as Error).toString())}
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

            return;
        }
    } else {
        throw new UnexpectedError(`${name} is unknown`);
    }
}

/**
 * TODO: [🧠][🛣] More elegant way to tracking than passing `name`
 * TODO: [🧠] !!! In-memory cache of same values to prevent multiple checks
 * Note: [🐠] This is how `checkSerializableAsJson` + `isSerializableAsJson` together can just retun true/false or rich error message
 */
