export const MODEL_VARIANTS = ['COMPLETION', 'CHAT'] as const;

/**
 * Model variant describes the very general type of the model
 *
 * There are two variants:
 * - **COMPLETION** - model that takes prompt and writes the rest of the text
 * - **CHAT** - model that takes prompt and previous messages and returns response
 */
export type ModelVariant = typeof MODEL_VARIANTS[number];

/**
 * Abstract way to specify the LLM. It does not specify the LLM with concrete version itself, only the requirements for the LLM.
 *
 * @see https://github.com/webgptorg/ptp#model-requirements
 */
export interface ModelRequirements {
    /**
     * Model variant describes the very general type of the model
     *
     * There are two variants:
     * - **COMPLETION** - model that takes prompt and writes the rest of the text
     * - **CHAT** - model that takes prompt and previous messages and returns response
     */
    readonly variant: ModelVariant;
}

/**
 * TODO: Maybe figure out better word than "variant"
 * TODO: Add here more requirement options like max context size, max tokens, etc.
 */
