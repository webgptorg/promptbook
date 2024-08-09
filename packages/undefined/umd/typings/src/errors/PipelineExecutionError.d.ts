/**
 * This error indicates errors during the execution of the pipeline
 *
 * @public exported from `@promptbook/core`
 */
export declare class PipelineExecutionError extends Error {
    readonly name = "PipelineExecutionError";
    constructor(message: string);
}
