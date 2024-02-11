import { ModelRequirements } from './types/ModelRequirements';
import { string_version } from './types/typeAliases';

/**
 * The version of the PTP
 */
export const PTBK_VERSION: string_version = '0.31.0-10'; // <- TODO: !!!! Auto-update this value on release

/**
 * Default model requirements for the pipeline
 *
 * Note: As default, we use the chat model gpt-3.5-turbo. For most tasks, this is the best model with most intuitive usage.
 *       GPT-4 is overkill for most tasks so keeping it as opt-in option.
 */
export const DEFAULT_MODEL_REQUIREMENTS: ModelRequirements = {
    modelVariant: 'CHAT',
    modelName: 'gpt-3.5-turbo',
};

/**
 * TODO: !!! Different default model for different model variant
 * TODO: [🧠] What should be the default model?
 */
