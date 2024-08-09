import type { PipelineStringToJsonOptions } from '../../conversion/pipelineStringToJson';
import type { string_folder_path } from '../../types/typeAliases';
import type { PipelineCollection } from '../PipelineCollection';
/**
 * Options for `createCollectionFromDirectory` function
 */
type CreatePipelineCollectionFromDirectoryOptions = PipelineStringToJsonOptions & {
    /**
     * If true, the directory is searched recursively for pipelines
     *
     * @default true
     */
    isRecursive?: boolean;
    /**
     * If true, the collection creation outputs information about each file it reads
     *
     * @default false
     */
    isVerbose?: boolean;
    /**
     * If true, directory will be scanned only when needed not during the construction
     *
     * @default false
     */
    isLazyLoaded?: boolean;
    /**
     * If true, whole collection creation crashes on error in any pipeline
     * If true and isLazyLoaded is true, the error is thrown on first access to the pipeline
     *
     * @default true
     */
    isCrashedOnError?: boolean;
};
/**
 * Constructs Pipeline from given directory
 *
 * Note: Works only in Node.js environment because it reads the file system
 *
 * @param path - path to the directory with pipelines
 * @param options - Misc options for the collection
 * @returns PipelineCollection
 * @public exported from `@promptbook/node`
 */
export declare function createCollectionFromDirectory(path: string_folder_path, options?: CreatePipelineCollectionFromDirectoryOptions): Promise<PipelineCollection>;
export {};
/**
 * Note: [🟢] This code should never be published outside of `@pipeline/node`
 */
