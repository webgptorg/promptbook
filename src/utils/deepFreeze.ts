import type { ReadonlyDeep } from 'type-fest';
import type { really_any } from './organization/really_any';

/**
 * @@@
 *
 * @returns The same object as the input, but deeply frozen
 *
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 */
export function deepFreeze<TObject>(objectValue: TObject): ReadonlyDeep<TObject> {
    const propertyNames = Object.getOwnPropertyNames(objectValue);
    for (const propertyName of propertyNames) {
        const value = (objectValue as really_any)[propertyName];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    }
    return Object.freeze(objectValue) as ReadonlyDeep<TObject>;
}

/**
 * @@@
 * @@@
 *
 * @returns The same object as the input, but deeply frozen
 *
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 */
export function deepFreezeWithSameType<TObject>(objectValue: TObject): TObject {
    return deepFreeze(objectValue) as TObject;
}

/**
 * TODO: [🔼] Export from `@promptbook/utils`
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */
