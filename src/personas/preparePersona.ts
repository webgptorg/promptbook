import PipelineCollection from '../../promptbook-collection/index.json';
import { createCollectionFromJson } from '../collection/constructors/createCollectionFromJson';
import { IS_VERBOSE } from '../config';
import { assertsExecutionSuccessful } from '../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { PrepareAndScrapeOptions } from '../prepare/PrepareAndScrapeOptions';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { string_persona_description } from '../types/typeAliases';
import type { TODO_any } from '../utils/organization/TODO_any';

/**
 * Prepares the persona for the pipeline
 *
 * @see https://github.com/webgptorg/promptbook/discussions/22
 * @public exported from `@promptbook/core`
 */
export async function preparePersona(
    personaDescription: string_persona_description,
    options: PrepareAndScrapeOptions,
): Promise<PersonaPreparedJson['modelRequirements']> {
    const { llmTools, isVerbose = IS_VERBOSE } = options;

    // TODO: [🌼] In future use `ptbk make` and maked getPipelineCollection
    const collection = createCollectionFromJson(...(PipelineCollection as TODO_any as Array<PipelineJson>));

    const preparePersonaExecutor = createPipelineExecutor({
        pipeline: await collection.getPipelineByUrl('https://promptbook.studio/promptbook/prepare-persona.ptbk.md'),
        tools: {
            llm: llmTools,
        },
    });

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
 * TODO: [🔃][main] !!!!! If the persona was prepared with different version or different set of models, prepare it once again
 * TODO: [🏢] !! Check validity of `modelName` in pipeline
 * TODO: [🏢] !! Check validity of `systemMessage` in pipeline
 * TODO: [🏢] !! Check validity of `temperature` in pipeline
 */
