import type { ModelRequirements } from '../../types/ModelRequirements';
import type { string_name } from '../../types/typeAliases';
import type { TaskJsonCommon } from './TaskJsonCommon';

/**
 * Template for prompt to LLM
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type PromptTaskJson = TaskJsonCommon & {
    readonly taskType: 'PROMPT_TEMPLATE_TASK';

    /**
     * Name of the persona who will be responding to this prompt
     */
    readonly personaName?: string_name;

    /**
     * Requirements for the model
     * - This is required only for taskType PROMPT_TEMPLATE_TASK
     */
    readonly modelRequirements?: Partial<ModelRequirements>;
};

/**
 * TODO: [👙][🧠] Maybe add `knowledge`, `actions` and `instruments` to be available granularly for each template
 *       @see https://github.com/webgptorg/promptbook/discussions/79
 * TODO: [💕][🧠] Just selecting gpt3 or gpt4 level of model
 * TODO: [🍙] Make some standard order of json properties
 */
