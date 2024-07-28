import { MAX_PARALLEL_COUNT } from '../config';
import { PrepareOptions } from '../prepare/PrepareOptions';
import { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import { string_persona_description } from '../types/typeAliases';
import { just } from '../utils/organization/just';
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
    just(personaDescription);
    just(llmTools);
    just(isVerbose);

    return {
        modelVariant: 'CHAT',
        modelName: 'gpt-4',
    };
}

/**
 * TODO: !!!! Write tests for `preparePersona`
 * TODO: !!!! Implement `preparePersona`
 * TODO: !!!! Use `preparePersona` in `pipelineStringToJson`
 * TODO: !!!! Use `preparePersona` in `createPipelineExecutor`
 * TODO: [🪂] Do it in parallel
 */
