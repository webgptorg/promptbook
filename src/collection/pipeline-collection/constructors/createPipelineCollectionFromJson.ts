import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { PipelineCollection } from '../PipelineCollection';
import { SimplePipelineCollection } from '../SimplePipelineCollection';

/**
 * Creates `PipelineCollection` from array of PipelineJson or PipelineString
 *
 * Note: Functions `pipelineCollectionToJson` and `createPipelineCollectionFromJson` are complementary
 * Note: Syntax, parsing, and logic consistency checks are performed on all sources during build
 *
 * @param promptbookSources
 * @returns PipelineCollection
 * @public exported from `@promptbook/core`
 */
export function createPipelineCollectionFromJson(...promptbooks: ReadonlyArray<PipelineJson>): PipelineCollection {
    return new SimplePipelineCollection(...promptbooks);
}
