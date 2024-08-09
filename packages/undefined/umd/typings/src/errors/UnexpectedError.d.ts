/**
 * This error type indicates that the error should not happen and its last check before crashing with some other error
 *
 * @public exported from `@promptbook/core`
 */
export declare class UnexpectedError extends Error {
    readonly name = "UnexpectedError";
    constructor(message: string);
}
