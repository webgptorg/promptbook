/**
 * This error occurs when some expectation is not met in the execution of the pipeline
 *
 * @public exported from `@promptbook/core`
 * Note: Do not throw this error, its reserved for `checkExpectations` and `createPipelineExecutor` and public ONLY to be serializable through remote server
 * Note: Always thrown in `checkExpectations` and catched in `createPipelineExecutor` and rethrown as `PipelineExecutionError`
 * Note: This is a kindof subtype of PipelineExecutionError
 */
export class ExpectError extends Error {
    public readonly name = 'ExpectError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ExpectError.prototype);
    }
}
