/**
 * This error indicates errors during the execution of the pipeline
 * 
 * @public exported from `@promptbook/core`
 */
export class PipelineExecutionError extends Error {
    public readonly name = 'PipelineExecutionError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PipelineExecutionError.prototype);
    }
}
