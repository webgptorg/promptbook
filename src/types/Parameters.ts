import type { InputParameters_private } from './InputParameters_private';
import type { Parameters_private } from './Parameters_private';
import type { ReservedParameters_private } from './ReservedParameters_private';

/**
 * Parameters of the pipeline
 *
 * There are three types of parameters:
 * - **INPUT PARAMETERs** are required to execute the pipeline.
 * - **Intermediate parameters** are used internally in the pipeline.
 * - **OUTPUT PARAMETERs** are not used internally in the pipeline, but are returned as the result of the pipeline execution.
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @see https://ptbk.io/parameters
 */
export type Parameters = Parameters_private;

/**
 * Parameters to pass to execution of the pipeline
 *
 * Note: [🚉] This should be fully serializable as JSON
 *
 * @see https://ptbk.io/parameters
 */
export type InputParameters = InputParameters_private;

/**
 * Represents a mapping of reserved parameter names to their values.
 * Reserved parameters are used internally by the pipeline and should not be set by users.
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ReservedParameters = ReservedParameters_private;
