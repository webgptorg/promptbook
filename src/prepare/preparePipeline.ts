import { addUsage } from '../execution/utils/addUsage';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { PreparationJson } from '../types/PipelineJson/PreparationJson';
import { forEachAsync } from '../execution/utils/forEachAsync';
import { MAX_PARALLEL_COUNT } from '../config';
import { prepareKnowledgePieces } from '../knowledge/prepare-knowledge/_common/prepareKnowledgePieces';
import { preparePersona } from '../personas/preparePersona';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import { $currentDate } from '../utils/currentDate';
import { PROMPTBOOK_VERSION } from '../version';
import type { PrepareOptions } from './PrepareOptions';

/**
 * Prepare pipeline from string (markdown) format to JSON format
 *
 * Note: This function does not validate logic of the pipeline
 * Note: This function acts as part of compilation process
 */
export async function preparePipeline(pipeline: PipelineJson, options: PrepareOptions): Promise<PipelineJson> {
    const { maxParallelCount = MAX_PARALLEL_COUNT } = options;
    const {
        /*
        <- TODO: [🧠][0] `promptbookVersion` */
        knowledgeSources /*
        <- TODO: [🧊] `knowledgePieces` */,
        personas /*
        <- TODO: [🧊] `preparations` */,
    } = pipeline;

    /*
    TODO: [🧠][0] Should this be done or not
    if (promptbookVersion !== PROMPTBOOK_VERSION) {
        throw new VersionMismatch(`Can not prepare the pipeline`, promptbookVersion);
    }
    */

    // ----- ID -----
    const currentPreparation: PreparationJson = {
        id: 1, // <- TODO: [🧊] Make incremental
        // TODO: [🍥]> date: $currentDate(),
        promptbookVersion: PROMPTBOOK_VERSION,
        modelUsage: addUsage(),
    };

    const preparations: Array<PreparationJson> = [
        // ...preparations
        // <- TODO: [🧊]
        currentPreparation,
    ];
    // ----- /ID -----

    // ----- Personas preparation -----
    // TODO: [🧠] Implement some `mapAsync` function
    const preparedPersonas: Array<PersonaPreparedJson> = [];
    await forEachAsync(
        personas,
        { maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ },
        async (persona) => {
            const modelRequirements = await preparePersona(persona.description, options);

            const preparedPersona: PersonaPreparedJson = {
                ...persona,
                modelRequirements,
                preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id],
            };

            preparedPersonas.push(preparedPersona);
        },
    );
    // ----- /Personas preparation -----

    // ----- Knowledge preparation -----

    const knowledgeSourcesPrepared = knowledgeSources.map((source) => ({
        ...source,
        preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id],
    }));

    const partialknowledgePiecesPrepared = await prepareKnowledgePieces(
        knowledgeSources /* <- TODO: [🧊] {knowledgeSources, knowledgePieces} */,
        options,
    );

    const knowledgePiecesPrepared = partialknowledgePiecesPrepared.map((piece) => ({
        ...piece,
        preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id],
    }));

    // ----- /Knowledge preparation -----

    return {
        ...pipeline,
        knowledgeSources: knowledgeSourcesPrepared,
        knowledgePieces: knowledgePiecesPrepared,
        personas: preparedPersonas,
        preparations,
    };
}

/**
 * TODO: Write tests for `preparePipeline`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 * TODO: [💸] Make utilities `interceptLlmTools` and `costLlmTools` to compute cost and DO put this counting logic in `prepareKnowledge` or `preparePersona`
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 */
