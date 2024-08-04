import { MAX_PARALLEL_COUNT } from '../config';
import { ZERO_USAGE } from '../execution/utils/addUsage';
import { forEachAsync } from '../execution/utils/forEachAsync';
import { prepareKnowledgePieces } from '../knowledge/prepare-knowledge/_common/prepareKnowledgePieces';
import { preparePersona } from '../personas/preparePersona';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PreparationJson } from '../types/PipelineJson/PreparationJson';
import { PROMPTBOOK_VERSION } from '../version';
import type { PrepareOptions } from './PrepareOptions';
import { prepareTemplates } from './prepareTemplates';

/**
 * Prepare pipeline from string (markdown) format to JSON format
 *
 * Note: This function does not validate logic of the pipeline
 * Note: This function acts as part of compilation process
 */
export async function preparePipeline(pipeline: PipelineJson, options: PrepareOptions): Promise<PipelineJson> {
    const { maxParallelCount = MAX_PARALLEL_COUNT } = options;
    const {
        parameters,
        promptTemplates,
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
        throw new VersionMismatchError(`Can not prepare the pipeline`, promptbookVersion);
    }
    */

    // ----- ID -----
    const currentPreparation: PreparationJson = {
        id: 1, // <- TODO: [🧊] Make incremental
        // TODO: [🍥]> date: $currentDate(),
        promptbookVersion: PROMPTBOOK_VERSION,
        modelUsage: ZERO_USAGE,
    };

    const preparations: Array<PreparationJson> = [
        // ...preparations
        // <- TODO: [🧊]
        currentPreparation,
    ];
    // ----- /ID -----

    // ----- Personas preparation -----
    // TODO: !!!! Extract to similar function as `prepareTemplates`
    // TODO: [🦪][🧠] Implement some `mapAsync` function
    const preparedPersonas: Array<PersonaPreparedJson> = new Array(personas.length);
    await forEachAsync(
        personas,
        { maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ },
        async (persona, index) => {
            const modelRequirements = await preparePersona(persona.description, options);

            const preparedPersona: PersonaPreparedJson = {
                ...persona,
                modelRequirements,
                preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id],
                // <- TODO: [🍙] Make some standart order of json properties
            };

            preparedPersonas[index] = preparedPersona;
        },
    );
    // ----- /Personas preparation -----

    // ----- Knowledge preparation -----
    // TODO: !!!! Extract to similar function as `prepareTemplates`
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
        // <- TODO: [🍙] Make some standart order of json properties
    }));
    // ----- /Knowledge preparation -----

    // ----- Templates preparation -----
    const { promptTemplatesPrepared /* TODO: parameters: parametersPrepared*/ } = await prepareTemplates(
        {
            parameters,
            promptTemplates,
            knowledgePiecesCount: knowledgePiecesPrepared.length,
        },
        options,
    );
    // ----- /Templates preparation -----

    return {
        ...pipeline,
        promptTemplates: promptTemplatesPrepared,
        knowledgeSources: knowledgeSourcesPrepared,
        knowledgePieces: knowledgePiecesPrepared,
        personas: preparedPersonas,
        preparations,
    };
}

/**
 * TODO: [🔼] !!! Export via `@promptbook/core`
 * TODO: Write tests for `preparePipeline`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 * TODO: [🎐] !!!! Use here countTotalUsage
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 */
