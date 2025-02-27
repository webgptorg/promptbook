import type { PipelineString } from "./PipelineString";
import { validatePipelineString } from "./validatePipelineString";

/**
 * Function `isValidPipelineString` will validate the if the string is a valid pipeline string
 * It does not check if the string is fully logically correct, but if it is a string that can be a pipeline string or the string looks completely different.
 *
 * @param {string} pipelineString the candidate for a pipeline string
 * @returns {boolean} if the string is a valid pipeline string
 * @public exported from `@promptbook/core`
 */
export function isValidPipelineString(
	pipelineString: string,
): pipelineString is PipelineString {
	try {
		validatePipelineString(pipelineString);
		return true;
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}

		return false;
	}
}

/**
 * TODO: [🧠][🈴] Where is the best location for this file
 */
