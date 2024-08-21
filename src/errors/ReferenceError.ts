/**
 * This error indicates errors in referencing promptbooks between each other
 *
 * @public exported from `@promptbook/core`
 */
export class PipelineUrlError extends Error {
    public readonly name = 'PipelineUrlError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PipelineUrlError.prototype);
    }
}
