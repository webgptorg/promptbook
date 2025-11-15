import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { PipelineCollection } from './PipelineCollection';

/**
 * Converts PipelineCollection to serialized JSON
 *
 * Note: Functions `pipelineCollectionToJson` and `createPipelineCollectionFromJson` are complementary
 *
 * @public exported from `@promptbook/core`
 */
export async function pipelineCollectionToJson(collection: PipelineCollection): Promise<ReadonlyArray<PipelineJson>> {
    const pipelineUrls = await collection.listPipelines();
    const promptbooks = await Promise.all(pipelineUrls.map((url) => collection.getPipelineByUrl(url)));
    return promptbooks;
}

/**
 * TODO: [🧠] Maybe clear `sourceFile` or clear when exposing through API or remote server
 */
