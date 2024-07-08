/**
 * This error indicates that the promptbook in a markdown format cannot be parsed into a valid promptbook object
 */
export class SyntaxError extends Error {
    public readonly name = 'SyntaxError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, SyntaxError.prototype);
    }
}
