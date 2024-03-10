/**
 * This error indicates that the promptbook in a markdown format cannot be parsed into a valid promptbook object
 */
export class PromptbookSyntaxError extends Error {
    public readonly name = 'PromptbookSyntaxError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PromptbookSyntaxError.prototype);
    }
}
