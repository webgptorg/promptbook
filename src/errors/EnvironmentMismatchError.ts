/**
 * This error type indicates that you try to use a feature that is not available in the current environment
 * 
 * @public exported from `@promptbook/core`
 */
export class EnvironmentMismatchError extends Error {
    public readonly name = 'EnvironmentMismatchError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, EnvironmentMismatchError.prototype);
    }
}
