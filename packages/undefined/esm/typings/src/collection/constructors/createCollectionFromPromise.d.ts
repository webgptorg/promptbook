import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineCollection } from '../PipelineCollection';
/**
 * Constructs Promptbook from async sources
 * It can be one of the following:
 * - Promise of array of PipelineJson or PipelineString
 * - Factory function that returns Promise of array of PipelineJson or PipelineString
 *
 * Note: This is useful as internal tool for other constructor functions like
 *       `createCollectionFromUrl` or `createCollectionFromDirectory`
 *       Consider using those functions instead of this one
 *
 * Note: The function does NOT return promise it returns the collection directly which waits for the sources to be resolved
 *       when error occurs in given promise or factory function, it is thrown during `listPipelines` or `getPipelineByUrl` call
 *
 * Note: Consider using  `createCollectionFromDirectory` or `createCollectionFromUrl`
 *
 * @param promptbookSourcesPromiseOrFactory
 * @returns PipelineCollection
 * @deprecated Do not use, it will became internal tool for other constructor functions
 * @public exported from `@promptbook/core`
 */
export declare function createCollectionFromPromise(promptbookSourcesPromiseOrFactory: Promise<Array<PipelineJson>> | (() => Promise<Array<PipelineJson>>)): PipelineCollection;
