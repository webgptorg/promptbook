/**
 * This error indicates that promptbook not found in the library
 */
export class PromptbookNotFoundError extends Error {
    public readonly name = 'PromptbookNotFoundError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PromptbookNotFoundError.prototype);
    }
}
