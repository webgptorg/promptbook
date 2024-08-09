/**
 * This error type indicates that some limit was reached
 *
 * @public exported from `@promptbook/core`
 */
export declare class LimitReachedError extends Error {
    readonly name = "LimitReachedError";
    constructor(message: string);
}
