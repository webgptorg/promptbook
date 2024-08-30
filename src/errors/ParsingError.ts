/**
 * This error indicates that the promptbook in a markdown format cannot be parsed into a valid promptbook object
 *
 * @public exported from `@promptbook/core`
 */
export class ParseError extends Error {
    public readonly name = 'ParseError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ParseError.prototype);
    }
}

/**
 * TODO: Maybe split `ParseError` and `ApplyError`
 */
