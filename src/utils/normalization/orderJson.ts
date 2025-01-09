import type { JsonArray, JsonObject } from 'type-fest';

/**
 * Options for the `orderJson` function
 */
export type OrderJsonOptions<TObject extends JsonObject | JsonArray> = {
    /**
     * Value to checked, ordered and deeply frozen
     */
    value: TObject;

    /**
     * Order of the object properties
     */
    order: Array<keyof TObject>;
    // <- TODO: !!!!!! Deep keyof
};

/**
 * Orders JSON object by keys
 *
 * @returns The same type of object as the input re-ordered
 * @public exported from `@promptbook/utils`
 */
export function orderJson<TObject extends JsonObject | JsonArray>(options: OrderJsonOptions<TObject>): TObject {
    const { value, order } = options;

    const orderedValue = {
        ...(order === undefined ? {} : Object.fromEntries(order.map((key) => [key, undefined]))),
        ...value,
    };

    return orderedValue;
}
