/**
 * This error indicates that the promptbook object has valid syntax but contains logical errors (like circular dependencies)
 *
 * @public exported from `@promptbook/core`
 */
export declare class PipelineLogicError extends Error {
    readonly name = "PipelineLogicError";
    constructor(message: string);
}
