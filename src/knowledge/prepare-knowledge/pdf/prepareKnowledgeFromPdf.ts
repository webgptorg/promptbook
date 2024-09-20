import { IS_VERBOSE } from '../../../config';
import { MAX_PARALLEL_COUNT } from '../../../config';
import type { PrepareOptions } from '../../../prepare/PrepareOptions';
import type { KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import type { string_base64 } from '../../../types/typeAliases';
import { TODO_USE } from '../../../utils/organization/TODO_USE';

/**
 * @@@
 *
 * @private still in development [🐝]
 */
export async function prepareKnowledgeFromPdf(
    content: string_base64 /* <- TODO: [🖖] Always the file, allow base64+filename+identification+mime or blob+filename+identification or file+identification */,
    options: PrepareOptions,
): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'> /* <- [🕡] */>> {
    const { llmTools, maxParallelCount = MAX_PARALLEL_COUNT, isVerbose = IS_VERBOSE } = options;

    TODO_USE(llmTools, maxParallelCount, isVerbose);

    /*
    [🧺]
    if (content.type !== 'application/pdf') {
        throw new Error('The content is not a PDF file');
    }
    */

    // TODO: Convert PDF to markdown

    return [];
}

/**
 * TODO: [🐝][🔼][main] !!! Export via `@promptbook/pdf`
 * TODO: [🧺] In future, content can be alse File or Blob BUT for now for wider compatibility its only base64
 *       @see https://stackoverflow.com/questions/14653349/node-js-cant-create-blobs
 * TODO: [🪂] Do it in parallel
 */
