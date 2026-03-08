import type { TupleToUnion } from 'type-fest';
import { RESERVED_PARAMETER_NAMES } from '../constants';
import type { really_unknown } from '../utils/organization/really_unknown';
import { string_base_58, string_sha256 } from './string_sha256';

/**
 * Semantic helper
 */
export type string_business_category_name = 'restaurant' | 'grocery' | 'person' | 'conference' | string;

/**
 * Semantic helper
 *
 * For example `"gpt-4"`
 */
export type string_model_name =
    | 'gpt-4'
    | 'gpt-4-0314'
    | 'gpt-4-0613'
    | 'gpt-4-32k'
    | 'gpt-4-32k-0314'
    | 'gpt-4-32k-0613'
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-16k'
    | 'gpt-3.5-turbo-0301'
    | 'gpt-3.5-turbo-0613'
    | 'gpt-3.5-turbo-16k-0613'
    | string /* <- TODO: Import from 'openai' package */;

/**
 * Semantic helper
 *
 * For example `"How many eyes does a cat have?"`
 */
export type string_prompt = string;

/**
 * Semantic helper
 *
 * For example `"A cat wearing a hat"`
 */
export type string_prompt_image = string;

/**
 * Semantic helper
 *
 * For example `"A cat wearing a {item}"`
 */
export type string_template = string;

/**
 * Semantic helper
 *
 * For example `"How many hats does the cat wear?"`
 */
export type string_text_prompt = string_prompt;

/**
 * Semantic helper
 *
 * For example `"How many hats does the cat wear?"`
 */
export type string_chat_prompt = string_text_prompt;

/**
 * Semantic helper
 *
 * For example `"You are an AI assistant. You are here to help me with my work."`
 */
export type string_system_message = string_text_prompt;

/**
 * Semantic helper
 *
 * For example `"Following is a text about cats: Once upon a time there was a cat"`
 */
export type string_completion_prompt = string_text_prompt;

/**
 * Semantic helper
 *
 * For example `"index"` or `"explanation"`
 * Always in kebab-case
 */
export type string_page = 'index' | string;

/**
 * Semantic helper
 *
 * For example `"a"`
 */
export type string_char = string;

/**
 * Semantic helper
 * Unique identifier of anything
 *
 * For example `"ainautes"`
 */
export type string_name = string;

/**
 * Semantic helper
 * Unique identifier of anything
 *
 * For example `"eventTitle"`
 */
export type string_parameter_name = string_name;

/**
 * Semantic helper
 * Unique identifier of parameter
 *
 * For example `"DevConf 2024"`
 */
export type string_parameter_value = string;

/**
 * Parameters of the pipeline
 *
 * There are three types of parameters:
 * - **INPUT PARAMETERs** are required to execute the pipeline.
 * - **Intermediate parameters** are used internally in the pipeline.
 * - **OUTPUT PARAMETERs** are not used internally in the pipeline, but are returned as the result of the pipeline execution.
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://ptbk.io/parameters
 */
export type Parameters = Exclude<Record<string_parameter_name, string_parameter_value>, ReservedParameters>;

/**
 * Parameters to pass to execution of the pipeline
 *
 * Note: [🚉] This should be fully serializable as JSON
 * @see https://ptbk.io/parameters
 */
export type InputParameters = Exclude<Record<string_parameter_name, really_unknown>, ReservedParameters>;

// <- TODO: [🧠] Maybe rename `Parameters` because it is already defined in global scope and also it is used more generally [👩🏾‍🤝‍🧑🏽]

/**
 * Semantic helper
 * Unique identifier of reserved parameter
 *
 * For example `"context"`
 */
export type string_reserved_parameter_name = TupleToUnion<typeof RESERVED_PARAMETER_NAMES>;

/**
 * Represents a mapping of reserved parameter names to their values.
 * Reserved parameters are used internally by the pipeline and should not be set by users.
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ReservedParameters = Record<string_reserved_parameter_name, string_parameter_value>;

/**
 * Semantic helper
 * Title of anything
 *
 * For example `"Ai*nautes"`
 */
export type string_title = string;

/**
 * Semantic helper
 *
 * For example `"My AI Assistant"`
 *
 * TODO: !!!! Brand the type
 */
export type string_agent_name = string;

/**
 * Semantic helper
 *
 * For example `"My AI Assistant"`
 */
export type string_agent_name_in_book = string;

// <- TODO: [🕛] There should be `agent_fullname` not `string_agent_name_in_book`
// <- TODO: [🕛] Search and distinguish between `string_agent_name` and `string_agent_name_in_book` ACRY + write here in JSDoc difference

/**
 * Semantic helper
 *
 * For example `"b126926439c5fcb83609888a11283723c1ef137c0ad599a77a1be81812bd221d"`
 */
export type string_agent_hash = string_sha256;
// <- TODO: [🧠] Maybe only first X characters of SHA-256

/**
 * Semantic helper
 *
 * For example `"3mJr7AoUXx2Wqd"`
 *
 * TODO: !!!! Brand the type
 */
export type string_agent_permanent_id = string_base_58;

/**
 * Unstructured description of the persona
 *
 * For example `"Skilled copywriter"`
 */
export type string_persona_description = string;

/**
 * Unstructured description of the model
 *
 * For example `"Model with logical reasoning and creative mindset"`
 */
export type string_model_description = string;
