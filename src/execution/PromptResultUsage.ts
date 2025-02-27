import type { KebabCase } from "type-fest";
import type { ExpectationUnit } from "../pipeline/PipelineJson/Expectations";
import type { UncertainNumber } from "./UncertainNumber";

/**
 * Usage statistics for one or many prompt results
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type PromptResultUsage = {
	/**
	 * Cost of the execution in USD
	 *
	 * Note: If the cost is unknown, the value 0 and isUncertain is true
	 */
	readonly price: UncertainNumber;

	/**
	 * Number of whatever used in the input aka. `prompt_tokens`
	 */
	readonly input: PromptResultUsageCounts;

	/**
	 * Number of tokens used in the output aka. `completion_tokens`
	 */
	readonly output: PromptResultUsageCounts;
};

/**
 * Record of all possible measurable units
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type PromptResultUsageCounts = Record<
	`${KebabCase<"TOKENS" | ExpectationUnit>}Count`,
	UncertainNumber
>;

/**
 * TODO: [🍙] Make some standard order of json properties
 */
