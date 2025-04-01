/**
 * Error thrown when a fetch request fails
 *
 * @public exported from `@promptbook/core`
 */
export class PromptbookFetchError extends Error {
    public readonly name = 'PromptbookFetchError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PromptbookFetchError.prototype);
    }
}
