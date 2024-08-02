import type { PipelineJson } from '../types/PipelineJson/PipelineJson';

/**
 * Determine if the pipeline is fully prepared
 */
export function isPipelinePrepared(pipeline: PipelineJson): boolean {
    return pipeline.preparations.length > 0;
}

/**
 * TODO: [🔼] Export via core or utils
 * TODO: [🧊] Pipeline can be partially prepared, this should return true ONLY if fully prepared
 */
