import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PipelineCollection } from '../PipelineCollection';
import { SimplePipelineCollection } from '../SimplePipelineCollection';

/**
 * Creates PipelineCollection from array of PipelineJson or PipelineString
 *
 * Note: Functions `collectionToJson` and `createCollectionFromJson` are complementary
 * Note: Syntax, parsing, and logic consistency checks are performed on all sources during build
 *
 * @param promptbookSources
 * @returns PipelineCollection
 * @public exported from `@promptbook/core`
 */
export function createCollectionFromJson(...promptbooks: ReadonlyArray<PipelineJson>): PipelineCollection {
    return new SimplePipelineCollection(...promptbooks);
}
