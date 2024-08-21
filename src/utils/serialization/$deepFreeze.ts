import type { ReadonlyDeep } from 'type-fest';
import type { really_any } from '../organization/really_any';

/**
 * @@@
 *
 * Note: `$` is used to indicate that this function is not a pure function - it mutates given object
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 *
 * @returns The same object as the input, but deeply frozen
 * @public exported from `@promptbook/utils`
 */
export function $deepFreeze<TObject>(objectValue: TObject): ReadonlyDeep<TObject> {
    const propertyNames = Object.getOwnPropertyNames(objectValue);
    for (const propertyName of propertyNames) {
        const value = (objectValue as really_any)[propertyName];
        if (value && typeof value === 'object') {
            $deepFreeze(value);
        }
    }
    return Object.freeze(objectValue) as ReadonlyDeep<TObject>;
}

/**
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */
