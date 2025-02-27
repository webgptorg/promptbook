import type { ModelVariant } from "../types/ModelVariant";
import type { string_model_description } from "../types/typeAliases";
import type { string_model_name } from "../types/typeAliases";
import type { string_title } from "../types/typeAliases";

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
};

/**
 * TODO: (not only [🕘]) Put pricing information here
 */
