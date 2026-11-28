import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';

/**
 * Shared validation context for one pipeline validation pass.
 *
 * @private type of `validatePipeline`
 */
export type PipelineValidationContext = {
    pipeline: PipelineJson;
    pipelineIdentification: string;
};

/**
 * Creates the shared validation context for one pipeline.
 *
 * @private function of `validatePipeline`
 */
export function createPipelineValidationContext(pipeline: PipelineJson): PipelineValidationContext {
    return {
        pipeline,
        pipelineIdentification: getPipelineIdentification(pipeline),
    };
}

/**
 * Builds a short file/url identification block for validation errors.
 *
 * @private internal utility of `validatePipeline`
 */
function getPipelineIdentification(pipeline: Pick<PipelineJson, 'sourceFile' | 'pipelineUrl'>): string {
    // Note: This is a 😐 implementation of [🚞]
    const pipelineIdentificationParts: Array<string> = [];

    if (pipeline.sourceFile !== undefined) {
        pipelineIdentificationParts.push(`File: ${pipeline.sourceFile}`);
    }

    if (pipeline.pipelineUrl !== undefined) {
        pipelineIdentificationParts.push(`Url: ${pipeline.pipelineUrl}`);
    }

    return pipelineIdentificationParts.join('\n');
}
