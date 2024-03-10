/**
 * This error indicates errors during the execution of the promptbook
 */
export class PromptbookExecutionError extends Error {
    public readonly name = 'PromptbookExecutionError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PromptbookExecutionError.prototype);
    }
}
