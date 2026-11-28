import { spaceTrim } from 'spacetrim';
import { PipelineLogicError } from '../../../errors/PipelineLogicError';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import { isValidPromptbookVersion } from '../../../utils/validators/semanticVersion/isValidPromptbookVersion';
import { isValidPipelineUrl } from '../../../utils/validators/url/isValidPipelineUrl';
import type { PipelineValidationContext } from './createPipelineValidationContext';

/**
 * Validates pipeline-level metadata fields.
 *
 * @private function of `validatePipeline`
 */
export function validatePipelineMetadata({ pipeline, pipelineIdentification }: PipelineValidationContext): void {
    validatePipelineUrl(pipeline, pipelineIdentification);
    validatePipelineBookVersion(pipeline, pipelineIdentification);
}

/**
 * Validates the pipeline URL, when present.
 *
 * @private internal utility of `validatePipelineMetadata`
 */
function validatePipelineUrl(pipeline: Pick<PipelineJson, 'pipelineUrl'>, pipelineIdentification: string): void {
    if (pipeline.pipelineUrl === undefined || isValidPipelineUrl(pipeline.pipelineUrl)) {
        return;
    }

    // <- Note: [🚲]
    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Invalid promptbook URL "${pipeline.pipelineUrl}"

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🐠]
        // <- TODO: [🚞]
    );
}

/**
 * Validates the Promptbook version, when present.
 *
 * @private internal utility of `validatePipelineMetadata`
 */
function validatePipelineBookVersion(
    pipeline: Pick<PipelineJson, 'bookVersion'>,
    pipelineIdentification: string,
): void {
    if (pipeline.bookVersion === undefined || isValidPromptbookVersion(pipeline.bookVersion)) {
        return;
    }

    // <- Note: [🚲]
    throw new PipelineLogicError(
        spaceTrim(
            (block) => `
                Invalid Promptbook Version "${pipeline.bookVersion}"

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}
