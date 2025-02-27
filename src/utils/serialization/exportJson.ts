import type { JsonArray, JsonObject } from "type-fest";
import type { OrderJsonOptions } from "../normalization/orderJson";
import { orderJson } from "../normalization/orderJson";
import type { TODO_any } from "../organization/TODO_any";
import { $deepFreeze } from "./$deepFreeze";
import type { CheckSerializableAsJsonOptions } from "./checkSerializableAsJson";
import { checkSerializableAsJson } from "./checkSerializableAsJson";
import { deepClone } from "./deepClone";

/**
 * Options for the `$exportJson` function
 */
export type ExportJsonOptions<TObject> = CheckSerializableAsJsonOptions &
	Partial<
		Pick<OrderJsonOptions<TObject & (JsonObject | JsonArray)>, "order">
	> & {
		/**
		 * Value to be checked, ordered and deeply frozen
		 */
		value: TObject;
	};

/**
 * Utility to export a JSON object from a function
 *
 * 1) Checks if the value is serializable as JSON
 * 2) Makes a deep clone of the object
 * 2) Orders the object properties
 * 2) Deeply freezes the cloned object
 *
 * Note: This function does not mutates the given object
 *
 * @returns The same type of object as the input but read-only and re-ordered
 * @public exported from `@promptbook/utils`
 */
export function exportJson<TObject>(
	options: ExportJsonOptions<TObject>,
): TObject {
	const { name, value, order, message } = options;

	checkSerializableAsJson({ name, value, message });

	const orderedValue =
		// TODO: Fix error "Type instantiation is excessively deep and possibly infinite."
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		order === undefined
			? deepClone(value)
			: orderJson({
					value: value as JsonObject | JsonArray,
					// <- Note: checkSerializableAsJson asserts that the value is serializable as JSON

					order: order as TODO_any,
				});

	$deepFreeze(orderedValue);

	return orderedValue as TODO_any;
}

/**
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */
