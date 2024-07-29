import { MAX_PARALLEL_COUNT } from '../config';
import type { PrepareOptions } from '../prepare/PrepareOptions';
import type { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import type { string_persona_description } from '../types/typeAliases';
import { TODO_USE } from '../utils/organization/TODO_USE';

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
    const { llmTools, maxParallelCount = MAX_PARALLEL_COUNT, isVerbose = false } = options;

    TODO_USE(maxParallelCount); // <- [🪂]
    TODO_USE(personaDescription); // <- !!!!!
    TODO_USE(llmTools); // <- !!!!!
    TODO_USE(isVerbose); // <- !!!!!

    return {
        modelVariant: 'CHAT',
        modelName: 'gpt-4',
    };
}

/**
 * TODO: [🪂] Do it in parallel
 */
