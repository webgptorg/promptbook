import type { string_url } from '../../types/typeAliases';
import type { PipelineCollection } from '../PipelineCollection';
/**
 * Options for `createCollectionFromDirectory` function
 */
type CreatePipelineCollectionFromUrlyOptions = {
    /**
     * If true, the collection creation outputs information about each file it reads
     *
     * @default false
     */
    readonly isVerbose?: boolean;
    /**
     * If true, directory will be scanned only when needed not during the construction
     *
     * @default false
     */
    readonly isLazyLoaded?: boolean;
};
/**
 * Constructs Promptbook from remote Promptbase URL
 * @returns PipelineCollection
 * @public exported from `@promptbook/core`
 */
export declare function createCollectionFromUrl(url: string_url | URL, options: CreatePipelineCollectionFromUrlyOptions): Promise<PipelineCollection>;
export {};
/**
 * TODO: !!!! [🧠] Library precompilation and do not mix markdown and json promptbooks
 */
