import type { string_pipeline_url } from '../../types/typeAliases';
import type { PipelineCollection } from '../PipelineCollection';
/**
 * Creates PipelineCollection as a subset of another PipelineCollection
 *
 * Note: You can use any type of collection as a parent collection - local, remote, etc.
 * Note: This is just a thin wrapper / proxy around the parent collection
 *
 * @param promptbookSources
 * @returns PipelineCollection
 * @public exported from `@promptbook/core`
 */
export declare function createSubcollection(collection: PipelineCollection, predicate: (url: string_pipeline_url) => boolean): PipelineCollection;
