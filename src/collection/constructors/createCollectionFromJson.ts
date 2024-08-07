import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineCollection } from '../PipelineCollection';
import { SimplePipelineCollection } from '../SimplePipelineCollection';

/**
 * Creates PipelineCollection from array of PipelineJson or PipelineString
 *
 * Note: Functions `collectionToJson` and `createCollectionFromJson` are complementary
 * Note: During the construction syntax and logic of all sources are validated
 *
 * @param promptbookSources
 * @returns PipelineCollection
 */
export function createCollectionFromJson(...promptbooks: Array<PipelineJson>): PipelineCollection {
    return new SimplePipelineCollection(...promptbooks);
}
