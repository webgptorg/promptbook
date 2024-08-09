/**
 * This error type indicates that some part of the code is not implemented yet
 *
 * @public exported from `@promptbook/core`
 */
export declare class NotYetImplementedError extends Error {
    readonly name = "NotYetImplementedError";
    constructor(message: string);
}
