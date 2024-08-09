import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PipelineCollection } from './PipelineCollection';
/**
 * Converts PipelineCollection to serialized JSON
 *
 * Note: Functions `collectionToJson` and `createCollectionFromJson` are complementary
 *
 * @public exported from `@promptbook/core`
 */
export declare function collectionToJson(collection: PipelineCollection): Promise<Array<PipelineJson>>;
/**
 * TODO: [🧠] Maybe clear `sourceFile` or clear when exposing through API or remote server
 */
