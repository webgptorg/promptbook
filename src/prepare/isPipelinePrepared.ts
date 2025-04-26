import { DEFAULT_BOOK_TITLE } from '../config';
import type { KnowledgeSourcePreparedJson } from '../pipeline/PipelineJson/KnowledgeSourceJson';
import type { PersonaPreparedJson } from '../pipeline/PipelineJson/PersonaJson';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';

/**
 * Determine if the pipeline is fully prepared
 *
 * @see https://github.com/webgptorg/promptbook/discussions/196
 *
 * @public exported from `@promptbook/core`
 */
export function isPipelinePrepared(pipeline: PipelineJson): boolean {
    // Note: Ignoring `pipeline.preparations` @@@
    // Note: Ignoring `pipeline.knowledgePieces` @@@

    if (pipeline.title === undefined || pipeline.title === '' || pipeline.title === DEFAULT_BOOK_TITLE) {
        return false;
    }

    if (!pipeline.personas.every((persona) => (persona as PersonaPreparedJson).modelsRequirements !== undefined)) {
        return false;
    }

    if (
        !pipeline.knowledgeSources.every(
            (knowledgeSource) => (knowledgeSource as KnowledgeSourcePreparedJson).preparationIds !== undefined,
        )
    ) {
        return false;
    }

    /*
    TODO: [🧠][🍫] `tasks` can not be determined if they are fully prepared SO ignoring them
    > if (!pipeline.tasks.every(({ preparedContent }) => preparedContent === undefined)) {
    >     return false;
    > }
    */

    return true;
}

/**
 * TODO: [🔃][main] If the pipeline was prepared with different version or different set of models, prepare it once again
 * TODO: [🐠] Maybe base this on `makeValidator`
 * TODO: [🧊] Pipeline can be partially prepared, this should return true ONLY if fully prepared
 * TODO: [🧿] Maybe do same process with same granularity and subfinctions as `preparePipeline`
 *     - [🏍] ? Is context in each task
 *     - [♨] Are examples prepared
 *     - [♨] Are tasks prepared
 */
