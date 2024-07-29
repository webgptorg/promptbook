import PipelineCollection from '../../promptbook-collection/index.json';
import { assertsExecutionSuccessful, createCollectionFromJson, createPipelineExecutor } from '../_packages/core.index';
import { PipelineJson } from '../_packages/types.index';
import type { PrepareOptions } from '../prepare/PrepareOptions';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { string_persona_description } from '../types/typeAliases';
import { TODO } from '../utils/organization/TODO';
import { $randomSeed } from '../utils/random/randomSeed';

/**
 * Prepares the persona for the pipeline
 *
 * @see https://github.com/webgptorg/promptbook/discussions/22
 * @private within the package
 */
export async function preparePersona(
    personaDescription: string_persona_description,
    options: PrepareOptions,
): Promise<PersonaPreparedJson['modelRequirements']> {
    const { llmTools, isVerbose = false } = options;

    // TODO: [🌼] In future use `ptbk make` and maked getPipelineCollection
    const collection = createCollectionFromJson(...(PipelineCollection as TODO as Array<PipelineJson>));

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

    // TODO: !!! Check validity of `modelName`
    // TODO: !!! Check validity of `systemMessage`
    // TODO: !!! Check validity of `temperature`

    console.log('!!!!', { modelName, systemMessage, temperature });

    return {
        modelVariant: 'CHAT',
        modelName,
        systemMessage,
        temperature,
    };
}
