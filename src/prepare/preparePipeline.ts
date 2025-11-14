import type { Writable } from 'type-fest';
import PipelineCollection from '../../books/index.json';
import { createCollectionFromJson } from '../collection/pipeline-collection/constructors/createCollectionFromJson';
import { DEFAULT_BOOK_TITLE, DEFAULT_IS_VERBOSE, DEFAULT_MAX_PARALLEL_COUNT } from '../config';
import { ORDER_OF_PIPELINE_JSON } from '../constants';
import { MissingToolsError } from '../errors/MissingToolsError';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../execution/ExecutionTools';
import { forEachAsync } from '../execution/utils/forEachAsync';
import { ZERO_USAGE } from '../execution/utils/usage-constants';
import { countUsage } from '../llm-providers/_common/utils/count-total-usage/countUsage';
import { getSingleLlmExecutionTools } from '../llm-providers/_multiple/getSingleLlmExecutionTools';
import { preparePersona } from '../personas/preparePersona';
import type { PersonaPreparedJson } from '../pipeline/PipelineJson/PersonaJson';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PreparationJson } from '../pipeline/PipelineJson/PreparationJson';
import { prepareKnowledgePieces } from '../scrapers/_common/prepareKnowledgePieces';
import type { TODO_any } from '../utils/organization/TODO_any';
import { exportJson } from '../utils/serialization/exportJson';
import { PROMPTBOOK_ENGINE_VERSION } from '../version';
import { isPipelinePrepared } from './isPipelinePrepared';
import type { PrepareAndScrapeOptions } from './PrepareAndScrapeOptions';
import { prepareTasks } from './prepareTasks';

/**
 * Prepare pipeline locally
 *
 * @see https://github.com/webgptorg/promptbook/discussions/196
 *
 * Note: This function does not validate logic of the pipeline
 * Note: This function acts as part of compilation process
 * Note: When the pipeline is already prepared, it returns the same pipeline
 * @public exported from `@promptbook/core`
 */
export async function preparePipeline(
    pipeline: PipelineJson,
    tools: Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers'>,
    options: PrepareAndScrapeOptions,
): Promise<PipelineJson> {
    if (isPipelinePrepared(pipeline)) {
        return pipeline;
    }

    const { rootDirname, maxParallelCount = DEFAULT_MAX_PARALLEL_COUNT, isVerbose = DEFAULT_IS_VERBOSE } = options;
    const {
        parameters,
        tasks,
        /*
        <- TODO: [🧠][🪑] `promptbookVersion` */
        knowledgeSources /*
        <- TODO: [🧊] `knowledgePieces` */,
        personas /*
        <- TODO: [🧊] `preparations` */,

        sources,
    } = pipeline;

    if (tools === undefined || tools.llm === undefined) {
        throw new MissingToolsError('LLM tools are required for preparing the pipeline');
    }

    const llmTools = getSingleLlmExecutionTools(tools.llm);

    const llmToolsWithUsage = countUsage(llmTools);
    //    <- TODO: [🌯]

    /*
    TODO: [🧠][🪑][🔃] Should this be done or not
    if (promptbookVersion !== PROMPTBOOK_ENGINE_VERSION) {
        throw new VersionMismatchError(`Can not prepare the pipeline`, promptbookVersion);
    }
    */

    // TODO: [🔃][main] If the pipeline was prepared with different version or different set of models, prepare it once again

    // ----- ID -----
    const currentPreparation: Writable<PreparationJson> = {
        id: 1, // <- TODO: [🧊] Make incremental
        // TODO: [🍥]> date: $getCurrentDate(),
        promptbookVersion: PROMPTBOOK_ENGINE_VERSION,
        usage: ZERO_USAGE,
    };

    const preparations: ReadonlyArray<PreparationJson> = [
        // ...preparations
        // <- TODO: [🧊]
        currentPreparation,
    ];
    // ----- /ID -----

    // ----- Title preparation -----

    let title = pipeline.title;
    if (title === undefined || title === '' || title === DEFAULT_BOOK_TITLE) {
        // TODO: [🌼] In future use `ptbk make` and made getPipelineCollection
        const collection = createCollectionFromJson(...(PipelineCollection as TODO_any as ReadonlyArray<PipelineJson>));

        const prepareTitleExecutor = createPipelineExecutor({
            pipeline: await collection.getPipelineByUrl('https://promptbook.studio/promptbook/prepare-title.book'),
            tools,
        });

        const result = await prepareTitleExecutor({
            book: sources.map(({ content }) => content).join('\n\n'),
        }).asPromise({ isCrashedOnError: true });

        const { outputParameters } = result;
        const { title: titleRaw } = outputParameters;

        if (isVerbose) {
            console.info(`The title is "${titleRaw}"`);
        }

        title = titleRaw || DEFAULT_BOOK_TITLE;
    }
    // ----- /Title preparation -----

    // ----- Personas preparation -----
    // TODO: Extract to similar function as `prepareTasks`
    // TODO: [🖌][🧠] Implement some `mapAsync` function
    const preparedPersonas: Array<PersonaPreparedJson> = new Array(personas.length);
    await forEachAsync(
        personas,
        { maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ },
        async (persona, index) => {
            const { modelsRequirements } = await preparePersona(
                persona.description,
                { ...tools, llm: llmToolsWithUsage },
                {
                    rootDirname,
                    maxParallelCount /* <- TODO:  [🪂] */,
                    isVerbose,
                },
            );

            const preparedPersona: PersonaPreparedJson = {
                ...persona,
                modelsRequirements,
                preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id],
                // <- TODO: [🍙] Make some standard order of json properties
            };

            preparedPersonas[index] = preparedPersona;
        },
    );
    // ----- /Personas preparation -----

    // ----- Knowledge preparation -----
    // TODO: Extract to similar function as `prepareTasks`
    const knowledgeSourcesPrepared = knowledgeSources.map((source) => ({
        ...source,
        preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id],
    }));

    const partialknowledgePiecesPrepared = await prepareKnowledgePieces(
        knowledgeSources /* <- TODO: [🧊] {knowledgeSources, knowledgePieces} */,
        { ...tools, llm: llmToolsWithUsage },
        {
            ...options,
            rootDirname,
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

    // ----- Tasks preparation -----
    const { tasksPrepared /* TODO: parameters: parametersPrepared*/ } = await prepareTasks(
        {
            parameters,
            tasks,
            knowledgePiecesCount: knowledgePiecesPrepared.length,
        },
        { ...tools, llm: llmToolsWithUsage },
        {
            rootDirname,
            maxParallelCount /* <- TODO:  [🪂] */,
            isVerbose,
        },
    );
    // ----- /Tasks preparation -----

    // TODO: [😂] Use here all `AsyncHighLevelAbstraction`

    // Note: Count total usage
    currentPreparation.usage = llmToolsWithUsage.getTotalUsage();

    return exportJson({
        name: 'pipelineJson',
        message: `Result of \`preparePipeline\``,
        order: ORDER_OF_PIPELINE_JSON,
        value: {
            ...pipeline,
            // <- TODO: Probably deeply clone the pipeline because `$exportJson` freezes the subobjects
            title,
            knowledgeSources: knowledgeSourcesPrepared,
            knowledgePieces: knowledgePiecesPrepared,
            tasks: [...tasksPrepared],
            // <- TODO: [🪓] Here should be no need for spreading new array, just ` tasks: tasksPrepared`
            personas: preparedPersonas,
            preparations: [...preparations],
            // <- TODO: [🪓] Here should be no need for spreading new array, just `preparations`
        },
    });
}

/**
 * TODO: Write tests for `preparePipeline` and `preparePipelineOnRemoteServer`
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
 * TODO: [🧠][♏] Maybe if expecting JSON (In Anthropic Claude and other models without non-json) and its not specified in prompt content, append the instructions
 *       @see https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/increase-consistency#specify-the-desired-output-format
 */
