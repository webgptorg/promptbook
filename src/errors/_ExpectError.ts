/**
 * This error occurs when some expectation is not met in the execution of the pipeline
 *
 * @private Always catched and rethrown as `PromptbookExecutionError`
 * Note: This is a kindof subtype of PromptbookExecutionError
 */
export class ExpectError extends Error {
    public readonly name = 'ExpectError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ExpectError.prototype);
    }
}
