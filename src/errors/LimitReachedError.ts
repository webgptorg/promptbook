/**
 * This error type indicates that some limit was reached
 */
export class LimitReachedError extends Error {
    public readonly name = 'LimitReachedError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, LimitReachedError.prototype);
    }
}
