import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PipelineCollection } from './PipelineCollection';

/**
 * Converts PipelineCollection to serialized JSON
 *
 * Note: Functions `collectionToJson` and `createCollectionFromJson` are complementary
 */
export async function collectionToJson(library: PipelineCollection): Promise<Array<PipelineJson>> {
    const promptbookUrls = await library.listPipelines();
    const promptbooks = await Promise.all(promptbookUrls.map((url) => library.getPipelineByUrl(url)));
    return promptbooks;
}
