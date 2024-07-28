import { addUsage } from '../_packages/core.index';
import { PreparationJson } from '../_packages/types.index';
import { forEachAsync } from '../_packages/utils.index';
import { MAX_PARALLEL_COUNT } from '../config';
import { VersionMismatch } from '../errors/VersionMismatch';
import { prepareKnowledge } from '../knowledge/prepare-knowledge/_common/prepareKnowledge';
import { preparePersona } from '../personas/preparePersona';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import { $currentDate } from '../utils/currentDate';
import { PROMPTBOOK_VERSION } from '../version';
import { PrepareOptions } from './PrepareOptions';

/**
 * Prepare pipeline from string (markdown) format to JSON format
 *
 * Note: This function does not validate logic of the pipeline
 * Note: This function acts as part of compilation process
 */
export async function preparePipeline(pipeline: PipelineJson, options: PrepareOptions): Promise<PipelineJson> {
    const { maxParallelCount = MAX_PARALLEL_COUNT } = options;
    const { promptbookVersion, knowledgeSources, knowledgePieces, personas /* preparations <- TODO: [🧊] */ } =
        pipeline;

    if (promptbookVersion !== PROMPTBOOK_VERSION) {
        throw new VersionMismatch(`Can not prepare pipeline`, promptbookVersion);
    }

    const currentPreparation: PreparationJson = {
        id: 1, // <- TODO: [🧊] Make incremental
        date: $currentDate(),
        promptbookVersion: PROMPTBOOK_VERSION,
        modelUsage: addUsage(),
    };

    const preparations: Array<PreparationJson> = [
        // ...preparations
        // <- TODO: [🧊]
        currentPreparation,
    ];

    forEachAsync(
        personas,
        { maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ },
        async (persona) => {
            const modelRequirements = await preparePersona(persona.description, options);
        },
    );

    await prepareKnowledge({ knowledgeSources, knowledgePieces }, options);

    return {
        ...pipeline,
        knowledgeSources,
        knowledgePieces,
        personas,
        preparations,
    };
}

/**
 * TODO: Write tests for `preparePipeline`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 */
