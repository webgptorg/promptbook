/**
 * This error type indicates that operation is technically possible but does not make sense
 *
 * For example, when you try to have pipeline with no output
 *
 * @public exported from `@promptbook/core`
 */
export class DoesNotMakeSenseError extends Error {
    public readonly name = 'DoesNotMakeSenseError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, DoesNotMakeSenseError.prototype);
    }
}
