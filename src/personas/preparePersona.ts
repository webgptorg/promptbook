import PipelineCollection from '../../books/index.json';
import { createCollectionFromJson } from '../collection/constructors/createCollectionFromJson';
import { DEFAULT_IS_VERBOSE } from '../config';
import { MissingToolsError } from '../errors/MissingToolsError';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../execution/ExecutionTools';
import { joinLlmExecutionTools } from '../llm-providers/multiple/joinLlmExecutionTools';
import type { PersonaPreparedJson } from '../pipeline/PipelineJson/PersonaJson';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PrepareAndScrapeOptions } from '../prepare/PrepareAndScrapeOptions';
import type { string_persona_description } from '../types/typeAliases';
import { arrayableToArray } from '../utils/arrayableToArray';
import type { TODO_any } from '../utils/organization/TODO_any';

/**
 * Prepares the persona for the pipeline
 *
 * @see https://github.com/webgptorg/promptbook/discussions/22
 * @public exported from `@promptbook/core`
 */
export async function preparePersona(
    personaDescription: string_persona_description,
    tools: Pick<ExecutionTools, 'llm'>,
    options: PrepareAndScrapeOptions,
): Promise<PersonaPreparedJson['modelRequirements']> {
    const { isVerbose = DEFAULT_IS_VERBOSE } = options;

    if (tools === undefined || tools.llm === undefined) {
        throw new MissingToolsError('LLM tools are required for preparing persona');
    }

    // TODO: [🌼] In future use `ptbk make` and made getPipelineCollection
    const collection = createCollectionFromJson(...(PipelineCollection as TODO_any as ReadonlyArray<PipelineJson>));

    const preparePersonaExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl('https://promptbook.studio/promptbook/prepare-persona.book'),
        tools,
    });

    // TODO: [🚐] Make arrayable LLMs -> single LLM DRY
    const _llms = arrayableToArray(tools.llm);
    const llmTools = _llms.length === 1 ? _llms[0]! : joinLlmExecutionTools(..._llms);

    const availableModels = await llmTools.listModels();
    const availableModelNames = availableModels
        .filter(({ modelVariant }) => modelVariant === 'CHAT')
        .map(({ modelName }) => modelName)
        .join(',');

    const result = await preparePersonaExecutor({ availableModelNames, personaDescription }).asPromise();

    const { outputParameters } = result;
    const { modelRequirements: modelRequirementsRaw } = outputParameters;

    const modelRequirements = JSON.parse(modelRequirementsRaw!);

    if (isVerbose) {
        console.info(`PERSONA ${personaDescription}`, modelRequirements);
    }

    const { modelName, systemMessage, temperature } = modelRequirements;

    return {
        modelVariant: 'CHAT',
        modelName,
        systemMessage,
        temperature,
    };
}

/**
 * TODO: [🔃][main] If the persona was prepared with different version or different set of models, prepare it once again
 * TODO: [🏢] Check validity of `modelName` in pipeline
 * TODO: [🏢] Check validity of `systemMessage` in pipeline
 * TODO: [🏢] Check validity of `temperature` in pipeline
 */
