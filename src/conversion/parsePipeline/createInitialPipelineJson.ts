import type { $PipelineJson } from '../../commands/_common/types/CommandParser';
import { DEFAULT_BOOK_TITLE } from '../../config';
import type { PipelineString } from '../../pipeline/PipelineString';

/**
 * Creates the mutable pipeline JSON structure used throughout parsing.
 *
 * @private internal utility of `parsePipeline`
 */
export function createInitialPipelineJson(pipelineString: PipelineString): $PipelineJson {
    return {
        title: DEFAULT_BOOK_TITLE,
        parameters: [],
        tasks: [],
        knowledgeSources: [],
        knowledgePieces: [],
        personas: [],
        preparations: [],
        sources: [
            {
                type: 'BOOK',
                path: null,
                // <- TODO: !!6 Pass here path of the file
                content: pipelineString,
            },
        ],
    };
}
