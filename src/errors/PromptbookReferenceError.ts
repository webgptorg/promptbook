/**
 * This error indicates errors in referencing promptbooks between each other
 */
export class PromptbookReferenceError extends Error {
    public readonly name = 'PromptbookReferenceError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PromptbookReferenceError.prototype);
    }
}
