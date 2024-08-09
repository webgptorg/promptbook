/**
 * This error indicates that the pipeline collection cannot be propperly loaded
 *
 * @public exported from `@promptbook/core`
 */
export declare class CollectionError extends Error {
    readonly name = "CollectionError";
    constructor(message: string);
}
