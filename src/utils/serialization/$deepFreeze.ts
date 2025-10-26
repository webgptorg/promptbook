import type { ReadonlyDeep } from 'type-fest';
import { $side_effect } from '../organization/$side_effect';
import type { really_any } from '../organization/really_any';
import type { TODO_any } from '../organization/TODO_any';

/**
 * Freezes the given object and all its nested objects recursively
 *
 * Note: `$` is used to indicate that this function is not a pure function - it mutates given object
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 *
 * @returns The same object as the input, but deeply frozen
 * @public exported from `@promptbook/utils`
 */
export function $deepFreeze<TObject>(objectValue: TObject): ReadonlyDeep<$side_effect & TObject> {
    if (Array.isArray(objectValue)) {
        return Object.freeze(objectValue.map((item) => $deepFreeze(item))) as TODO_any;
    }

    const propertyNames = Object.getOwnPropertyNames(objectValue);
    for (const propertyName of propertyNames) {
        const value = (objectValue as really_any)[propertyName];
        if (value && typeof value === 'object') {
            $deepFreeze(value);
        }
    }

    Object.freeze(objectValue);

    return objectValue as ReadonlyDeep<TObject>;
}

/**
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */
