import type { $PipelineJson } from '../../commands/_common/types/CommandParser';

/**
 * Builds a short file/url identification block for parse errors.
 *
 * @private internal utility of `parsePipeline`
 */
export function getPipelineIdentification($pipelineJson: $PipelineJson): string {
    // Note: This is a 😐 implementation of [🚞]
    const pipelineIdentificationParts: Array<string> = [];

    if ($pipelineJson.sourceFile !== undefined) {
        pipelineIdentificationParts.push(`File: ${$pipelineJson.sourceFile}`);
    }

    if ($pipelineJson.pipelineUrl !== undefined) {
        pipelineIdentificationParts.push(`Url: ${$pipelineJson.pipelineUrl}`);
    }

    return pipelineIdentificationParts.join('\n');
}
