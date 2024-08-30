/**
 * This error indicates that the promptbook in a markdown format cannot be parsed into a valid promptbook object
 *
 * @public exported from `@promptbook/core`
 */
export class ParsingError extends Error {
    public readonly name = 'ParsingError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ParsingError.prototype);
    }
}

/**
 * TODO: Maybe split `ParsingError` and `ApplyError`
 */
