import type { InputParameters_private } from './InputParameters_private';
import type { Parameters_private } from './Parameters_private';
import type { ReservedParameters_private } from './ReservedParameters_private';
import type { string_agent_hash_private } from './string_agent_hash_private';
import type { string_agent_name_private } from './string_agent_name_private';
import type { string_agent_name_in_book_private } from './string_agent_name_in_book_private';
import type { string_agent_permanent_id_private } from './string_agent_permanent_id_private';
import type { string_business_category_name_private } from './string_business_category_name_private';
import type { string_char_private } from './string_char_private';
import type { string_chat_prompt_private } from './string_chat_prompt_private';
import type { string_completion_prompt_private } from './string_completion_prompt_private';
import type { string_model_description_private } from './string_model_description_private';
import type { string_model_name_private } from './string_model_name_private';
import type { string_name_private } from './string_name_private';
import type { string_page_private } from './string_page_private';
import type { string_parameter_value_private } from './string_parameter_value_private';
import type { string_persona_description_private } from './string_persona_description_private';
import type { string_prompt_private } from './string_prompt_private';
import type { string_prompt_image_private } from './string_prompt_image_private';
import type { string_reserved_parameter_name_private } from './string_reserved_parameter_name_private';
import type { string_system_message_private } from './string_system_message_private';
import type { string_template_private } from './string_template_private';
import type { string_text_prompt_private } from './string_text_prompt_private';
import type { string_title_private } from './string_title_private';

/**
 * Semantic helper
 *
 */
export type string_business_category_name = string_business_category_name_private;

/**
 * Semantic helper
 *
 * For example `"gpt-4"`
 *
 */
export type string_model_name = string_model_name_private;

/**
 * Semantic helper
 *
 * For example `"How many eyes does a cat have?"`
 *
 */
export type string_prompt = string_prompt_private;

/**
 * Semantic helper
 *
 * For example `"A cat wearing a hat"`
 *
 */
export type string_prompt_image = string_prompt_image_private;

/**
 * Semantic helper
 *
 * For example `"A cat wearing a {item}"`
 *
 */
export type string_template = string_template_private;

/**
 * Semantic helper
 *
 * For example `"How many hats does the cat wear?"`
 *
 */
export type string_text_prompt = string_text_prompt_private;

/**
 * Semantic helper
 *
 * For example `"How many hats does the cat wear?"`
 *
 */
export type string_chat_prompt = string_chat_prompt_private;

/**
 * Semantic helper
 *
 * For example `"You are an AI assistant. You are here to help me with my work."`
 *
 */
export type string_system_message = string_system_message_private;

/**
 * Semantic helper
 *
 * For example `"Following is a text about cats: Once upon a time there was a cat"`
 *
 */
export type string_completion_prompt = string_completion_prompt_private;

/**
 * Semantic helper
 *
 * For example `"index"` or `"explanation"`
 * Always in kebab-case
 *
 */
export type string_page = string_page_private;

/**
 * Semantic helper
 *
 * For example `"a"`
 *
 */
export type string_char = string_char_private;

/**
 * Semantic helper
 * Unique identifier of anything
 *
 * For example `"ainautes"`
 *
 */
export type string_name = string_name_private;

/**
 * Semantic helper
 * Unique identifier of anything
 *
 * For example `"eventTitle"`
 *
 */
export type string_parameter_name = string_name;

/**
 * Semantic helper
 * Unique identifier of parameter
 *
 * For example `"DevConf 2024"`
 *
 */
export type string_parameter_value = string_parameter_value_private;

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
export type Parameters = Parameters_private;

/**
 * Parameters to pass to execution of the pipeline
 *
 * Note: [🚉] This should be fully serializable as JSON
 * @see https://ptbk.io/parameters
 */
export type InputParameters = InputParameters_private;

/**
 * Semantic helper
 * Unique identifier of reserved parameter
 *
 * For example `"context"`
 *
 */
export type string_reserved_parameter_name = string_reserved_parameter_name_private;

/**
 * Represents a mapping of reserved parameter names to their values.
 * Reserved parameters are used internally by the pipeline and should not be set by users.
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ReservedParameters = ReservedParameters_private;

/**
 * Semantic helper
 * Title of anything
 *
 * For example `"Ai*nautes"`
 *
 */
export type string_title = string_title_private;

/**
 * Semantic helper
 *
 * For example `"My AI Assistant"`
 *
 * TODO: !!!! Brand the type
 */
export type string_agent_name = string_agent_name_private;

/**
 * Semantic helper
 *
 * For example `"My AI Assistant"`
 *
 */
export type string_agent_name_in_book = string_agent_name_in_book_private;

/**
 * Semantic helper
 *
 * For example `"b126926439c5fcb83609888a11283723c1ef137c0ad599a77a1be81812bd221d"`
 *
 */
export type string_agent_hash = string_agent_hash_private;

/**
 * Semantic helper
 *
 * For example `"3mJr7AoUXx2Wqd"`
 *
 * TODO: !!!! Brand the type
 */
export type string_agent_permanent_id = string_agent_permanent_id_private;

/**
 * Unstructured description of the persona
 *
 * For example `"Skilled copywriter"`
 *
 */
export type string_persona_description = string_persona_description_private;

/**
 * Unstructured description of the model
 *
 * For example `"Model with logical reasoning and creative mindset"`
 *
 */
export type string_model_description = string_model_description_private;

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
