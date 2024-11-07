import PipelineCollection from '../../promptbook-collection/index.json';
import { createCollectionFromJson } from '../collection/constructors/createCollectionFromJson';
import { DEFAULT_IS_VERBOSE } from '../config';
import { MissingToolsError } from '../errors/MissingToolsError';
import { assertsExecutionSuccessful } from '../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../execution/ExecutionTools';
import { joinLlmExecutionTools } from '../llm-providers/multiple/joinLlmExecutionTools';
import type { PrepareAndScrapeOptions } from '../prepare/PrepareAndScrapeOptions';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
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

    // TODO: [🌼] In future use `ptbk make` and maked getPipelineCollection
    const collection = createCollectionFromJson(...(PipelineCollection as TODO_any as ReadonlyArray<PipelineJson>));

    const preparePersonaExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl('https://promptbook.studio/promptbook/prepare-persona.ptbk.md'),
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

    const result = await preparePersonaExecutor({ availableModelNames, personaDescription });

    assertsExecutionSuccessful(result);

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
 * TODO: [🔃][main] !! If the persona was prepared with different version or different set of models, prepare it once again
 * TODO: [🏢] !! Check validity of `modelName` in pipeline
 * TODO: [🏢] !! Check validity of `systemMessage` in pipeline
 * TODO: [🏢] !! Check validity of `temperature` in pipeline
 */
