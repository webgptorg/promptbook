import type { KnowledgeSourcePreparedJson } from '../types/PipelineJson/KnowledgeSourceJson';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';

/**
 * Determine if the pipeline is fully prepared
 *
 * @public exported from `@promptbook/core`
 */
export function isPipelinePrepared(pipeline: PipelineJson): boolean {
    // Note: Ignoring `pipeline.preparations` @@@
    // Note: Ignoring `pipeline.knowledgePieces` @@@

    if (!pipeline.personas.every((persona) => (persona as PersonaPreparedJson).modelRequirements !== undefined)) {
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
    TODO: [🧠][🍫] `templates` can not be determined if they are fully prepared SO ignoring them
    > if (!pipeline.templates.every(({ preparedContent }) => preparedContent === undefined)) {
    >     return false;
    > }
    */

    return true;
}

/**
 * TODO: [🔃] !!!!! If the pipeline was prepared with different version or different set of models, prepare it once again
 * TODO: [🐠] Maybe base this on `makeValidator`
 * TODO: [🧊] Pipeline can be partially prepared, this should return true ONLY if fully prepared
 * TODO: [🧿] Maybe do same process with same granularity and subfinctions as `preparePipeline`
 *     - [🏍] ? Is context in each template
 *     - [♨] Are samples prepared
 *     - [♨] Are templates prepared
 */
