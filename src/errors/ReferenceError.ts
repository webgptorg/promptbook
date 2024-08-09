/**
 * This error indicates errors in referencing promptbooks between each other
 * 
 * @public exported from `@promptbook/core`
 */
export class ReferenceError extends Error {
    public readonly name = 'ReferenceError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ReferenceError.prototype);
    }
}
