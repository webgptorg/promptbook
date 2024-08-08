/**
 * This error indicates that the pipeline collection cannot be propperly loaded
 *
 * @public exported from `@promptbook/core`
 */
export class CollectionError extends Error {
    public readonly name = 'CollectionError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CollectionError.prototype);
    }
}
