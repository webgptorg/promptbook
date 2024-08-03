import { string_parameter_name, string_parameter_value } from "./typeAliases";

/**
 * Parameters of the pipeline
 *
 * There are three types of parameters:
 * - **INPUT PARAMETERs** are required to execute the pipeline.
 * - **Intermediate parameters** are used internally in the pipeline.
 * - **OUTPUT PARAMETERs** are not used internally in the pipeline, but are returned as the result of the pipeline execution.
 *
 * @see https://github.com/webgptorg/promptbook#parameters
 */
export type Parameters = Record<string_parameter_name, string_parameter_value>;

// <- TODO: !!!!!! Make `ReservedParameters`
// <- TODO: !!!!!! Exclude `ReservedParameters` from `Parameters`
