import type { ModelRequirements } from '../ModelRequirements';
import { string_name } from '../typeAliases';
import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';

/**
 * Template for prompt to LLM
 */
export type LlmTemplateJson = PromptTemplateJsonCommon & {
    readonly blockType: 'PROMPT_TEMPLATE';

    /**
     * Name of the persona who will be responding to this prompt
     */
    readonly personaName: string_name | null;

    /**
     * Requirements for the model
     * - This is required only for blockType PROMPT_TEMPLATE
     */
    readonly modelRequirements: ModelRequirements; // <- TODO: !!!! Make Partial<ModelRequirements> and optional;
};

/**
 * TODO: !!!!emoji ACRY + discussion [🧠] Should be knowledge, actions and ... aviable granularry for each template and/or persona
 * TODO: !!!! [👙][🧠] Just selecting gpt3 or gpt4 level of modelT
 */
