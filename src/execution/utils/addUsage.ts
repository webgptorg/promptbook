import type { WritableDeep } from "type-fest";
import { deepClone } from "../../utils/serialization/deepClone";
import type { PromptResultUsage } from "../PromptResultUsage";
import { ZERO_USAGE } from "./usage-constants";

/**
 * Function `addUsage` will add multiple usages into one
 *
 * Note: If you provide 0 values, it returns ZERO_USAGE
 *
 * @public exported from `@promptbook/core`
 */
export function addUsage(
	...usageItems: ReadonlyArray<PromptResultUsage>
): PromptResultUsage {
	return usageItems.reduce<PromptResultUsage>(
		(acc: WritableDeep<PromptResultUsage>, item) => {
			acc.price.value += item.price?.value || 0;

			for (const key of Object.keys(acc.input)) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				//@ts-ignore
				if (item.input[key]) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					acc.input[key].value += item.input[key].value || 0;
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					if (item.input[key].isUncertain) {
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						//@ts-ignore
						acc.input[key].isUncertain = true;
					}
				}
			}

			for (const key of Object.keys(acc.output)) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				//@ts-ignore
				if (item.output[key]) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					acc.output[key].value += item.output[key].value || 0;
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					if (item.output[key].isUncertain) {
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						//@ts-ignore
						acc.output[key].isUncertain = true;
					}
				}
			}

			return acc;
		},
		deepClone(ZERO_USAGE),
	);
}
