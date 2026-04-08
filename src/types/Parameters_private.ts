import type { ReservedParameters_private } from './ReservedParameters_private';
import type { string_parameter_name } from './string_name';
import type { string_parameter_value_private } from './string_parameter_value_private';

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
 *
 * @private internal utility of `Parameters.ts`
 */
export type Parameters_private = Exclude<Record<string_parameter_name, string_parameter_value_private>, ReservedParameters_private>;

// <- TODO: [🧠] Maybe rename `Parameters` because it is already defined in global scope and also it is used more generally [👩🏾‍🤝‍🧑🏽]
