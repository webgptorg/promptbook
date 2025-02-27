import spaceTrim from "spacetrim";
import { ALL_ERRORS } from "../0-index";
import type { ErrorJson } from "./ErrorJson";

/**
 * Serializes an error into a [🚉] JSON-serializable object
 *
 * @public exported from `@promptbook/utils`
 */

export function serializeError(error: Error): ErrorJson {
	const { name, message, stack } = error;

	if (!Object.keys(ALL_ERRORS).includes(name)) {
		console.error(
			spaceTrim(
				(block) => `
          
                    Cannot serialize error with name "${name}"

                    ${block(stack || message)}
                
                `,
			),
		);
	}

	return {
		name: name as ErrorJson["name"],
		message,
		stack,
	};
}
