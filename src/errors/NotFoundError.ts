/**
 * This error indicates that promptbook not found in the library
 */
export class NotFoundError extends Error {
    public readonly name = 'NotFoundError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
