import type { ModelRequirements } from '../ModelRequirements';
import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';

/**
 * Template for prompt to LLM
 */
export type LlmTemplateJson = PromptTemplateJsonCommon & {
    readonly executionType: 'PROMPT_TEMPLATE';

    /**
     * Requirements for the model
     * - This is required only for executionType PROMPT_TEMPLATE
     */
    readonly modelRequirements: ModelRequirements; // <- TODO: !!! Make Partial<ModelRequirements> and optional;
};

/**
 * TODO: [👙][🧠] Just selecting gpt3 or gpt4 level of modelT
 */
