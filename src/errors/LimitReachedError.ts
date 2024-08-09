/**
 * This error type indicates that some limit was reached
 * 
 * @public exported from `@promptbook/core`
 */
export class LimitReachedError extends Error {
    public readonly name = 'LimitReachedError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, LimitReachedError.prototype);
    }
}
