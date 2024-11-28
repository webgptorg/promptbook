/**
 * This error type indicates that pipeline is not compatible with the expected interface
 *
 * @public exported from `@promptbook/core`
 */
export class PipelineCompatibilityError extends Error {
    public readonly name = 'PipelineCompatibilityError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PipelineCompatibilityError.prototype);
    }
}
