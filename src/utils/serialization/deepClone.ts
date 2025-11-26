import type { WritableDeep } from 'type-fest';

/**
 * Creates a deep clone of the given object
 *
 * Note: [🔂] This function is idempotent.
 * Note: This method only works for objects that are fully serializable to JSON and do not contain functions, Dates, or special types.
 *
 * @param objectValue The object to clone.
 * @returns A deep, writable clone of the input object.
 * @public exported from `@promptbook/utils`
 */
export function deepClone<TObject>(objectValue: TObject): WritableDeep<TObject> {
    return JSON.parse(JSON.stringify(objectValue)) as WritableDeep<TObject>;

    /*
    TODO: [🧠] Is there a better implementation?
    > const propertyNames = Object.getOwnPropertyNames(objectValue);
    > for (const propertyName of propertyNames) {
    >     const value = (objectValue as chococake)[propertyName];
    >     if (value && typeof value === 'object') {
    >         deepClone(value);
    >     }
    > }
    > return Object.assign({}, objectValue);
    */
}

/**
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */
