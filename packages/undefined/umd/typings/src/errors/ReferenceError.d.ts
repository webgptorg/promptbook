/**
 * This error indicates errors in referencing promptbooks between each other
 *
 * @public exported from `@promptbook/core`
 */
export declare class ReferenceError extends Error {
    readonly name = "ReferenceError";
    constructor(message: string);
}
