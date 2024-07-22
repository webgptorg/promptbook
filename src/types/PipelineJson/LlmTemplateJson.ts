import type { ModelRequirements } from '../ModelRequirements';
import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';

/**
 * Template for prompt to LLM
 */
export type LlmTemplateJson = PromptTemplateJsonCommon & {
    readonly blockType: 'PROMPT_TEMPLATE';

    /**
     * Requirements for the model
     * - This is required only for blockType PROMPT_TEMPLATE
     */
    readonly modelRequirements: ModelRequirements; // <- TODO: !!! Make Partial<ModelRequirements> and optional;
};

/**
 * TODO: [👙][🧠] Just selecting gpt3 or gpt4 level of modelT
 */
