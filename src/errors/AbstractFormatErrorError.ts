/**
 * This error indicates problems parsing the format value
 *
 * For example, when the format value is not a valid JSON or CSV
 * This is not thrown directly but in extended classes
 *
 * @public exported from `@promptbook/core`
 */
export class AbstractFormatErrorError extends Error {
    public readonly name = 'AbstractFormatErrorError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, AbstractFormatErrorError.prototype);
    }
}
