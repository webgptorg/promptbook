/**
 * This error type indicates that you try to use a feature that is not available in the current environment
 *
 * @public exported from `@promptbook/core`
 */
export declare class EnvironmentMismatchError extends Error {
    readonly name = "EnvironmentMismatchError";
    constructor(message: string);
}
