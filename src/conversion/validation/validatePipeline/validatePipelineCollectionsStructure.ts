import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../errors/ParseError';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { PipelineValidationContext } from './createPipelineValidationContext';

/**
 * Validates that the expected top-level collections have array structure.
 *
 * @private function of `validatePipeline`
 */
export function validatePipelineCollectionsStructure({
    pipeline,
    pipelineIdentification,
}: PipelineValidationContext): void {
    validatePipelineParametersCollection(pipeline, pipelineIdentification);
    validatePipelineTasksCollection(pipeline, pipelineIdentification);
}

/**
 * Validates that `pipeline.parameters` is an array.
 *
 * @private internal utility of `validatePipelineCollectionsStructure`
 */
function validatePipelineParametersCollection(
    pipeline: Pick<PipelineJson, 'parameters'>,
    pipelineIdentification: string,
): void {
    // TODO: [🧠] Maybe do here some proper JSON-schema / ZOD checking
    if (Array.isArray(pipeline.parameters)) {
        return;
    }

    // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
    throw new ParseError(
        spaceTrim(
            (block) => `
                Pipeline is valid JSON but with wrong structure

                \`PipelineJson.parameters\` expected to be an array, but got ${typeof pipeline.parameters}

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}

/**
 * Validates that `pipeline.tasks` is an array.
 *
 * @private internal utility of `validatePipelineCollectionsStructure`
 */
function validatePipelineTasksCollection(pipeline: Pick<PipelineJson, 'tasks'>, pipelineIdentification: string): void {
    // TODO: [🧠] Maybe do here some proper JSON-schema / ZOD checking
    if (Array.isArray(pipeline.tasks)) {
        return;
    }

    // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
    throw new ParseError(
        spaceTrim(
            (block) => `
                Pipeline is valid JSON but with wrong structure

                \`PipelineJson.tasks\` expected to be an array, but got ${typeof pipeline.tasks}

                ${block(pipelineIdentification)}
            `,
        ),
        // <- TODO: [🚞]
    );
}
