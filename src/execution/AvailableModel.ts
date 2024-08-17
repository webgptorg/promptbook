import type { ModelVariant } from '../types/ModelVariant';
import type { string_model_name, string_title } from '../types/typeAliases';

/**
 * Represents a model that can be used for prompt execution
 */
export type AvailableModel = {
    /**
     * The model title
     */
    readonly modelTitle: string_title;

    /**
     * The model name aviailable
     */
    readonly modelName: string_model_name;

    /**
     * Variant of the model
     */
    readonly modelVariant: ModelVariant;
};
