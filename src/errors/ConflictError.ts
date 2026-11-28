/**
 * Signals that the requested operation could not be completed because the target already exists.
 *
 * @public exported from `@promptbook/core`
 */
export class ConflictError extends Error {
    public readonly name = 'ConflictError';

    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
