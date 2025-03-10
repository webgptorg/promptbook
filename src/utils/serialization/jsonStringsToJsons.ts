import { isValidJsonString } from '../../formats/json/utils/isValidJsonString';

/**
 * Recursively converts JSON strings to JSON objects

 * @public exported from `@promptbook/utils`
 */
export function jsonStringsToJsons<T>(object: T): T {
    if (object === null) {
        return object;
    }

    if (Array.isArray(object)) {
        return object.map(jsonStringsToJsons) as unknown as T;
    }

    if (typeof object !== 'object') {
        return object;
    }

    const newObject = { ...object } as Record<string, unknown>;

    for (const [key, value] of Object.entries(object)) {
        if (typeof value === 'string' && isValidJsonString(value)) {
            newObject[key] = JSON.parse(value);
        } else {
            newObject[key] = jsonStringsToJsons(value);
        }
    }

    return newObject as T;
}

/**
 * TODO: Type the return type correctly
 */
