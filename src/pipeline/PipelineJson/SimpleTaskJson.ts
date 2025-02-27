import type { CommonTaskJson } from "./CommonTaskJson";

/**
 * Task for simple concatenation of strings
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/17
 */
export type SimpleTaskJson = CommonTaskJson & {
	readonly taskType: "SIMPLE_TASK";
};

/**
 * TODO: [🍙] Make some standard order of json properties
 */
