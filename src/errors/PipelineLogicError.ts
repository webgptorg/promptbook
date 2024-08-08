/**
 * This error indicates that the promptbook object has valid syntax but contains logical errors (like circular dependencies)
 * 
 * @public exported from `@promptbook/core`
 */
export class PipelineLogicError extends Error {
    public readonly name = 'PipelineLogicError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, PipelineLogicError.prototype);
    }
}
