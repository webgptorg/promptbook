/**
 * This error indicates that the promptbook object has valid syntax but contains logical errors (like circular dependencies)
 */
export class PromptbookLogicError extends Error {
    public readonly name = 'PromptbookLogicError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PromptbookLogicError.prototype);
    }
}
