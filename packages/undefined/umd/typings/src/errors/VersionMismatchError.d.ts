import type { string_semantic_version } from '../types/typeAliases';
/**
 * This error type indicates that the version of the pipeline is not matching the expected version
 *
 * @public exported from `@promptbook/core`
 */
export declare class VersionMismatchError extends Error {
    readonly name = "UnexpectedError";
    constructor(message: string, expectedVersion: string_semantic_version);
}
