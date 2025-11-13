/**
 * This error indicates that promptbook operation is not allowed
 *
 * @public exported from `@promptbook/core`
 */
export class NotAllowed extends Error {
    public readonly name = 'NotAllowed';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, NotAllowed.prototype);
    }
}
