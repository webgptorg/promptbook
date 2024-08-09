import type { PrepareOptions } from '../../../prepare/PrepareOptions';
import type { KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import type { string_base64 } from '../../../types/typeAliases';
/**
 * @@@
 */
export declare function prepareKnowledgeFromPdf(content: string_base64, options: PrepareOptions): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>>>;
/**
 * TODO: [🐝][🔼] !!! Export via `@promptbook/pdf`
 * TODO: [🧺] In future, content can be alse File or Blob BUT for now for wider compatibility its only base64
 *       @see https://stackoverflow.com/questions/14653349/node-js-cant-create-blobs
 * TODO: [🪂] Do it in parallel
 */
