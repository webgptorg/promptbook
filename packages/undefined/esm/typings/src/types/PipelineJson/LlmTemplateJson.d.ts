import type { ModelRequirements } from '../ModelRequirements';
import type { string_name } from '../typeAliases';
import type { PromptTemplateJsonCommon } from './PromptTemplateJsonCommon';
/**
 * Template for prompt to LLM
 */
export type LlmTemplateJson = PromptTemplateJsonCommon & {
    readonly blockType: 'PROMPT_TEMPLATE';
    /**
     * Name of the persona who will be responding to this prompt
     */
    readonly personaName?: string_name;
    /**
     * Requirements for the model
     * - This is required only for blockType PROMPT_TEMPLATE
     */
    readonly modelRequirements: ModelRequirements;
};
/**
 * TODO: [🧠][🥜]
 * TODO: [👙][🧠] Maybe add `knowledge`, `actions` and `instruments` to be available granularly for each template
 *       @see https://github.com/webgptorg/promptbook/discussions/79
 * TODO: [💕][🧠] Just selecting gpt3 or gpt4 level of model
 * TODO: [🍙] Make some standart order of json properties
 */
