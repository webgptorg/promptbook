/**
 * This error indicates that the promptbook in a markdown format cannot be parsed into a valid promptbook object
 *
 * @public exported from `@promptbook/core`
 */
export declare class ParsingError extends Error {
    readonly name = "ParsingError";
    constructor(message: string);
}
