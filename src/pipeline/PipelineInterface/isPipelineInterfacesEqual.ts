import type { really_any } from "../../utils/organization/really_any";
import type { PipelineInterface } from "./PipelineInterface";

/**
 * @@@
 *
 * @deprecated https://github.com/webgptorg/promptbook/pull/186
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export function isPipelineInterfacesEqual(
	pipelineInterface1: PipelineInterface,
	pipelineInterface2: PipelineInterface,
): boolean {
	for (const whichParameters of [
		"inputParameters",
		"outputParameters",
	] as const) {
		const parameters1 = pipelineInterface1[whichParameters] as really_any; // <- Note: `isPipelineInterfacesEqual` is just temporary solution, no need to fix this
		const parameters2 = pipelineInterface2[whichParameters] as really_any;

		if (parameters1.length !== parameters2.length) {
			return false;
		}

		for (const parameter of parameters1) {
			const matchingParameter = parameters2.find(
				({ name }: really_any) => name === parameter.name,
			);

			if (!matchingParameter) {
				return false;
			}

			// Note: Do not compare description, it is not relevant for compatibility

			if (matchingParameter.isInput !== parameter.isInput) {
				return false;
			}

			if (matchingParameter.isOutput !== parameter.isOutput) {
				return false;
			}
		}
	}

	return true;
}
