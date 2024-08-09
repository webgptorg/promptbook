/**
 * This error occurs when some expectation is not met in the execution of the pipeline
 *
 * @private Always catched and rethrown as `PipelineExecutionError`
 * Note: This is a kindof subtype of PipelineExecutionError
 */
export declare class ExpectError extends Error {
    readonly name = "ExpectError";
    constructor(message: string);
}
