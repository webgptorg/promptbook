import { KnowledgeSourcePreparedJson, PersonaPreparedJson } from '../_packages/types.index';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';

/**
 * Determine if the pipeline is fully prepared
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

    return true;
}

/**
 * TODO: [🔼] Export via core or utils
 * TODO: [🧊] Pipeline can be partially prepared, this should return true ONLY if fully prepared
 */
