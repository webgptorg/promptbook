/**
 * This error indicates errors during the execution of the promptbook
 */
export class ExecutionError extends Error {
    public readonly name = 'ExecutionError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ExecutionError.prototype);
    }
}
