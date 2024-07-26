/**
 * This error indicates errors during the execution of the pipeline
 */
export class PipelineExecutionError extends Error {
    public readonly name = 'PipelineExecutionError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PipelineExecutionError.prototype);
    }
}
