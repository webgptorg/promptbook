import type { ReadonlyDeep } from "type-fest";
import type { ErrorJson } from "../errors/utils/ErrorJson";

/**
 * @@@
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type AbstractTaskResult = {
	/**
	 * Whether the execution was successful, details are available in `executionReport`
	 */
	readonly isSuccessful: boolean;

	/**
	 * Errors that occured during the execution, details are available in `executionReport`
	 */
	readonly errors: ReadonlyDeep<ReadonlyArray<ErrorJson>>;

	/**
	 * Warnings that occured during the execution, details are available in `executionReport`
	 */
	readonly warnings: ReadonlyDeep<ReadonlyArray<ErrorJson>>;
};

/**
 * TODO: [🧠] Should this file be in /execution or /types folder?
 * TODO: [🧠] Maybe constrain `ErrorJson` -> `ErrorJson & { name: 'PipelineExecutionError' | 'Error' }`
 */
