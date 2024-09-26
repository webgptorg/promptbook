/**
 * This error indicates problems parsing the format value
 *
 * For example, when the format value is not a valid JSON or CSV
 * This is not thrown directly but in extended classes
 *
 * @public exported from `@promptbook/core`
 */
export class AbstractFormatError extends Error {
    // Note: To allow instanceof do not put here error `name`
    // public readonly name = 'AbstractFormatError';

    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, AbstractFormatError.prototype);
    }
}
