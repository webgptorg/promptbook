/**
 * This error indicates errors during the execution of the pipeline
 */
export class ExecutionError extends Error {
    public readonly name = 'ExecutionError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ExecutionError.prototype);
    }
}
