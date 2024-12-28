import type { string_name } from '../../types/typeAliases';
import { $deepFreeze } from './$deepFreeze';
import { checkSerializableAsJson } from './checkSerializableAsJson';

/**
 * Options for the `$exportJson` function
 */
export type ExportJsonOptions<TObject> = {
    /**
     * Value to checked, ordered and deeply frozen
     */
    value: TObject;

    /**
     *
     */
    order?: Array<keyof TObject>;
    // <- TODO: Deep keyof

    /**
     * Semantic name of the value for debugging purposes
     */
    name: string_name;

    /**
     * Optional message alongside the value for debugging purposes
     */
    message?: string;
};

/**
 * Utility to export a JSON object from a function
 *
 * 1) Checks if the value is serializable as JSON
 * 2) Orders the object properties
 * 2) Deeply freezes **AND MUTATES** the subobjects (and subarrays)
 *
 * Note: This function mutates the subobjects (and subarrays) and returns just shallow frozen copy of the input object with deeply frozen subobjects
 *
 * @returns The same object as the input, but deeply frozen
 * @private this is in comparison to `deepFreeze` a more specific utility and maybe not very good practice to use without specific reason and considerations
 */
export function $exportJson<TObject>(options: ExportJsonOptions<TObject>): TObject {
    const { name, value, order, message } = options;

    checkSerializableAsJson({ name, value, message });

    const orderedValue = {
        ...(order === undefined ? {} : Object.fromEntries(order.map((key) => [key, undefined]))),
        ...value,
    };

    $deepFreeze(orderedValue);

    return orderedValue;
}

/**
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */
