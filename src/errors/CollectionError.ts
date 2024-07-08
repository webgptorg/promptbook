/**
 * This error indicates that the promptbook library cannot be propperly loaded
 */
export class CollectionError extends Error {
    public readonly name = 'CollectionError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CollectionError.prototype);
    }
}
