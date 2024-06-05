/**
 * This error indicates that the promptbook library cannot be propperly loaded
 */
export class PromptbookLibraryError extends Error {
    public readonly name = 'PromptbookLibraryError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PromptbookLibraryError.prototype);
    }
}
