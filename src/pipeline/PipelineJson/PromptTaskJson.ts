import type { ModelRequirements } from '../../types/ModelRequirements';
import type { string_name } from '../../types/string_name';
import type { CommonTaskJson } from './CommonTaskJson';

/**
 * Task for prompt to LLM
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type PromptTaskJson = CommonTaskJson & {
    readonly taskType: 'PROMPT_TASK';

    /**
     * Name of the persona who will be responding to this prompt
     */
    readonly personaName?: string_name;

    /**
     * Requirements for the model
     * - This is required only for taskType PROMPT_TASK
     */
    readonly modelRequirements?: Partial<ModelRequirements>;
};

/**
 * TODO: [👙][🧠] Maybe add `knowledge`, `actions` and `instruments` to be available granularly for each task
 *       @see https://github.com/webgptorg/promptbook/discussions/79
 * TODO: [💕][🧠] Just selecting gpt3 or gpt4 level of model
 * TODO: [🍙] Make some standard order of json properties
 */
