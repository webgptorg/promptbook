/**
 * This error indicates error from the database
 *
 * @public exported from `@promptbook/core`
 */
export class DatabaseError extends Error {
    public readonly name = 'DatabaseError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}

