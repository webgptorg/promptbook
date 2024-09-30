import type { Writable } from 'type-fest';
import { IS_VERBOSE, MAX_PARALLEL_COUNT } from '../config';
import { MissingToolsError } from '../errors/MissingToolsError';
import { ZERO_USAGE } from '../execution/utils/addUsage';
import { forEachAsync } from '../execution/utils/forEachAsync';
import { countTotalUsage } from '../llm-providers/_common/utils/count-total-usage/countTotalUsage';
import { preparePersona } from '../personas/preparePersona';
import { prepareKnowledgePieces } from '../scrapers/_common/prepareKnowledgePieces';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PreparationJson } from '../types/PipelineJson/PreparationJson';
import { $asDeeplyFrozenSerializableJson } from '../utils/serialization/$asDeeplyFrozenSerializableJson';
import { clonePipeline } from '../utils/serialization/clonePipeline';
import { PROMPTBOOK_VERSION } from '../version';
import { isPipelinePrepared } from './isPipelinePrepared';
import type { PrepareAndScrapeOptions } from './PrepareAndScrapeOptions';
import { prepareTemplates } from './prepareTemplates';

/**
 * Prepare pipeline from string (markdown) format to JSON format
 *
 * Note: This function does not validate logic of the pipeline
 * Note: This function acts as part of compilation process
 * Note: When the pipeline is already prepared, it returns the same pipeline
 * @public exported from `@promptbook/core`
 */
export async function preparePipeline(pipeline: PipelineJson, options: PrepareAndScrapeOptions): Promise<PipelineJson> {
    if (isPipelinePrepared(pipeline)) {
        return pipeline;
    }

    const { llmTools, filesystemTools, maxParallelCount = MAX_PARALLEL_COUNT, isVerbose = IS_VERBOSE } = options;
    const {
        parameters,
        templates,
        /*
        <- TODO: [🧠][🪑] `promptbookVersion` */
        knowledgeSources /*
        <- TODO: [🧊] `knowledgePieces` */,
        personas /*
        <- TODO: [🧊] `preparations` */,
    } = pipeline;

    if (llmTools === undefined) {
        throw new MissingToolsError('LLM tools are required for preparing the pipeline');
    }

    const llmToolsWithUsage = countTotalUsage(llmTools);
    //    <- TODO: [🌯]

    /*
    TODO: [🧠][🪑][🔃] Should this be done or not
    if (promptbookVersion !== PROMPTBOOK_VERSION) {
        throw new VersionMismatchError(`Can not prepare the pipeline`, promptbookVersion);
    }
    */

    // TODO: [🔃][main] !!!!! If the pipeline was prepared with different version or different set of models, prepare it once again

    // ----- ID -----
    const currentPreparation: Writable<PreparationJson> = {
        id: 1, // <- TODO: [🧊] Make incremental
        // TODO: [🍥]> date: $currentDate(),
        promptbookVersion: PROMPTBOOK_VERSION,
        usage: ZERO_USAGE,
    };

    const preparations: Array<PreparationJson> = [
        // ...preparations
        // <- TODO: [🧊]
        currentPreparation,
    ];
    // ----- /ID -----

    // ----- Personas preparation -----
    // TODO: !! Extract to similar function as `prepareTemplates`
    // TODO: [🖌][🧠] Implement some `mapAsync` function
    const preparedPersonas: Array<PersonaPreparedJson> = new Array(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        personas.length,
    );
    await forEachAsync(
        personas,
        { maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ },
        async (persona, index) => {
            const modelRequirements = await preparePersona(persona.description, {
                llmTools: llmToolsWithUsage,
                filesystemTools,
                maxParallelCount /* <- TODO:  [🪂] */,
                isVerbose,
            });

            const preparedPersona: PersonaPreparedJson = {
                ...persona,
                modelRequirements,
                preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id],
                // <- TODO: [🍙] Make some standard order of json properties
            };

            preparedPersonas[index] = preparedPersona;
        },
    );
    // ----- /Personas preparation -----

    // ----- Knowledge preparation -----
    // TODO: !! Extract to similar function as `prepareTemplates`
    const knowledgeSourcesPrepared = knowledgeSources.map((source) => ({
        ...source,
        preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id],
    }));

    const partialknowledgePiecesPrepared = await prepareKnowledgePieces(
        knowledgeSources /* <- TODO: [🧊] {knowledgeSources, knowledgePieces} */,
        {
            ...options,
            llmTools: llmToolsWithUsage,
            filesystemTools,
            maxParallelCount /* <- TODO:  [🪂] */,
            isVerbose,
        },
    );

    const knowledgePiecesPrepared = partialknowledgePiecesPrepared.map((piece) => ({
        ...piece,
        preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id],
        // <- TODO: [🍙] Make some standard order of json properties
    }));
    // ----- /Knowledge preparation -----

    // ----- Templates preparation -----
    const { templatesPrepared /* TODO: parameters: parametersPrepared*/ } = await prepareTemplates(
        {
            parameters,
            templates,
            knowledgePiecesCount: knowledgePiecesPrepared.length,
        },
        {
            llmTools: llmToolsWithUsage,
            filesystemTools,
            maxParallelCount /* <- TODO:  [🪂] */,
            isVerbose,
        },
    );
    // ----- /Templates preparation -----

    // Note: Count total usage
    currentPreparation.usage = llmToolsWithUsage.getTotalUsage();

    return $asDeeplyFrozenSerializableJson('Prepared PipelineJson', {
        ...clonePipeline(pipeline),
        templates: templatesPrepared,
        knowledgeSources: knowledgeSourcesPrepared,
        knowledgePieces: knowledgePiecesPrepared,
        personas: preparedPersonas,
        preparations,
    });
}

/**
 * TODO: Write tests for `preparePipeline`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🧠][♏] Maybe if expecting JSON (In Anthropic Claude and other models without non-json) and its not specified in prompt content, append the instructions
 *       @see https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/increase-consistency#specify-the-desired-output-format
 */
