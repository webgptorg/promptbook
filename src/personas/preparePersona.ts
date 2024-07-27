import { LlmExecutionTools } from '../execution/LlmExecutionTools';
import { PersonaPreparedJson } from '../types/PipelineJson/PersonaJson';
import { string_persona_description } from '../types/typeAliases';
import { just } from '../utils/just';

type PreparePersonaOptions = {
    /**
     * Description of the persona
     */
    personaDescription: string_persona_description;

    /**
     * The LLM tools to use for the conversion and extraction of knowledge
     *
     * Note: If you want to use multiple LLMs, you can use `joinLlmExecutionTools` to join them first
     */
    llmTools: LlmExecutionTools;

    /**
     * If true, the preaparation of knowledge logs additional information
     *
     * @default false
     */
    isVerbose?: boolean;
};

/**
 * Prepares the persona for the pipeline
 *
 * @private within the package
 */
export async function preparePersona(
    options: PreparePersonaOptions,
): Promise<PersonaPreparedJson['modelRequirements']> {
    const { personaDescription, llmTools, isVerbose } = options;

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
 */
