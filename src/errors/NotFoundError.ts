/**
 * This error indicates that promptbook not found in the collection
 * 
 * @public exported from `@promptbook/core`
 */
export class NotFoundError extends Error {
    public readonly name = 'NotFoundError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
