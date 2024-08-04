import type { KnowledgeSourcePreparedJson } from '../types/PipelineJson/KnowledgeSourceJson';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';

/**
 * Determine if the pipeline is fully prepared
 */
export function isPipelinePrepared(pipeline: PipelineJson): boolean {
    // Note: Ignoring `pipeline.preparations` @@@
    // Note: Ignoring `pipeline.knowledgePieces` @@@

    if (!pipeline.personas.every((persona) => (persona as PersonaPreparedJson).modelRequirements !== undefined)) {
        console.log('!!!!', 'Not all personas have modelRequirements');
        return false;
    }

    if (
        !pipeline.knowledgeSources.every(
            (knowledgeSource) => (knowledgeSource as KnowledgeSourcePreparedJson).preparationIds !== undefined,
        )
    ) {
        console.log('!!!!', 'Not all knowledgeSources have preparationIds');
        return false;
    }



    return true;
}

/**
 * TODO: [🐠] Maybe base this on `makeValidator`
 * TODO: [🔼] Export via core or utils
 * TODO: [🧊] Pipeline can be partially prepared, this should return true ONLY if fully prepared
 * TODO: [🧿] Maybe do same process with same granularity and subfinctions as `preparePipeline`
 *     - Is context in each template
 *     - Are samples prepared
 *     - Are templates prepared
 */
