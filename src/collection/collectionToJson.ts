import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PipelineCollection } from './PipelineCollection';

/**
 * Converts PipelineCollection to serialized JSON
 *
 * Note: Functions `collectionToJson` and `createCollectionFromJson` are complementary
 */
export async function collectionToJson(collection: PipelineCollection): Promise<Array<PipelineJson>> {
    const pipelineUrls = await collection.listPipelines();
    const promptbooks = await Promise.all(pipelineUrls.map((url) => collection.getPipelineByUrl(url)));
    return promptbooks;
}
