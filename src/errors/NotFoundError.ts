/**
 * This error indicates that the requested resource (for example promptbook in the library ) was not found
 */
export class NotFoundError extends Error {
    public readonly name = 'NotFoundError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
