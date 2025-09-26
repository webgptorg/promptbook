import type { ModelVariant } from '../types/ModelVariant';
import type { number_usd } from '../types/typeAliases';
import type { string_model_description } from '../types/typeAliases';
import type { string_model_name } from '../types/typeAliases';
import type { string_title } from '../types/typeAliases';

/**
 * Represents a model that can be used for prompt execution
 */
export type AvailableModel = {
    /**
     * The model title, when not provided, the `modelName` should be used
     *
     * @example "GPT o1"
     */
    readonly modelTitle?: string_title;

    /**
     * The model name aviailable
     *
     * @example "o1"
     */
    readonly modelName: string_model_name;

    /**
     * Variant of the model
     *
     * @example "CHAT"
     */
    readonly modelVariant: ModelVariant;

    /**
     * Unstructured description of the model
     *
     * This will be used to pick the best available model for each task
     *
     * @example "Model with 1 billion parameters and advanced reasoning capabilities"
     */
    readonly modelDescription?: string_model_description;

    /**
     * Pricing information for the model
     */
    readonly pricing?: {
        readonly prompt: number_usd;
        readonly output: number_usd;
    };

    /**
     * If the model is deprecated, it should not be used for new tasks
     */
    readonly isDeprecated?: boolean;

    /**
     * List of model requirements that this specific model does not support
     * For example, some OpenAI models don't support custom temperature values
     */
    readonly unsupportedModelRequirements?: Partial<Array<keyof import('../types/ModelRequirements').ModelRequirements>>;
};

/**
 * TODO: [🧠] Maybe rename to something else - like `ModelInformation` or `ModelMetadata`
 */
