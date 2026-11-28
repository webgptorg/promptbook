import { spaceTrim } from 'spacetrim';
import { IS_PIPELINE_LOGIC_VALIDATED } from '../../config';
import { PipelineLogicError } from '../../errors/PipelineLogicError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import { createPipelineValidationContext } from './validatePipeline/createPipelineValidationContext';
import { validatePipelineCollectionsStructure } from './validatePipeline/validatePipelineCollectionsStructure';
import { validatePipelineDependencyResolution } from './validatePipeline/validatePipelineDependencyResolution';
import { validatePipelineMetadata } from './validatePipeline/validatePipelineMetadata';
import { validatePipelineParameters } from './validatePipeline/validatePipelineParameters';
import { validatePipelineTasks } from './validatePipeline/validatePipelineTasks';

/**
 * Validates PipelineJson if it is logically valid
 *
 * It checks:
 * -   if it has correct parameters dependency
 *
 * It does NOT check:
 * -   if it is valid json
 * -   if it is meaningful
 *
 * Note: [🔂] This function is idempotent.
 *
 * @param pipeline valid or invalid PipelineJson
 * @returns the same pipeline if it is logically valid
 * @throws {PipelineLogicError} on logical error in the pipeline
 *
 * @public exported from `@promptbook/core`
 */
export function validatePipeline(pipeline: PipelineJson): PipelineJson {
    if (IS_PIPELINE_LOGIC_VALIDATED) {
        validatePipeline_InnerFunction(pipeline);
    } else {
        try {
            validatePipeline_InnerFunction(pipeline);
        } catch (error) {
            if (!(error instanceof PipelineLogicError)) {
                throw error;
            }

            console.error(
                spaceTrim(
                    (block) => `
                        Pipeline is not valid but logic errors are temporarily disabled via \`IS_PIPELINE_LOGIC_VALIDATED\`

                        ${block((error as PipelineLogicError).message)}
                    `,
                ),
            );
        }
    }

    return pipeline;
}

/**
 * Validates pipeline inner function.
 *
 * @private internal function for `validatePipeline`
 */
export function validatePipeline_InnerFunction(pipeline: PipelineJson): void {
    // TODO: [🧠] Maybe test if promptbook is a promise and make specific error case for that
    const context = createPipelineValidationContext(pipeline);

    validatePipelineMetadata(context);
    validatePipelineCollectionsStructure(context);
    validatePipelineParameters(context);
    validatePipelineTasks(context);
    validatePipelineDependencyResolution(context);

    // Note: Check that formfactor is corresponding to the pipeline interface
    // TODO: !!6 Implement this
    // pipeline.formfactorName
}

/**
 * TODO: [🧞‍♀️] Do not allow joker + foreach
 * TODO: [🧠] Work with promptbookVersion
 * TODO: Use here some json-schema, Zod or something similar and change it to:
 *     > /**
 *     >  * Validates PipelineJson if it is logically valid.
 *     >  *
 *     >  * It checks:
 *     >  * -   it has a valid structure
 *     >  * -   ...
 *     >  ex port function validatePipeline(promptbook: really_unknown): asserts promptbook is PipelineJson {
 */

// TODO: [🧳][main] !!4 Validate that all examples match expectations
// TODO: [🧳][🐝][main] !!4 Validate that knowledge is valid (non-void)
// TODO: [🧳][main] !!4 Validate that persona can be used only with CHAT variant
// TODO: [🧳][main] !!4 Validate that parameter with reserved name not used RESERVED_PARAMETER_NAMES
// TODO: [🧳][main] !!4 Validate that reserved parameter is not used as joker
// TODO: [🧠] Validation not only logic itself but imports around - files and websites and rerefenced pipelines exists
// TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
