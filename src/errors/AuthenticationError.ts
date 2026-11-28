/**
 * AuthenticationError is thrown from login function which is dependency of remote server
 *
 * @public exported from `@promptbook/core`
 */
export class AuthenticationError extends Error {
    public readonly name = 'AuthenticationError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}
