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
export type Parameters = object;

/**
 * TODO: Constrain type to Simple key-value object, only string keys and string values and no index signature + only camelCase keys and spaceTrimmed values
 */
