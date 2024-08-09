/**
 * This error indicates that promptbook not found in the collection
 *
 * @public exported from `@promptbook/core`
 */
export declare class NotFoundError extends Error {
    readonly name = "NotFoundError";
    constructor(message: string);
}
