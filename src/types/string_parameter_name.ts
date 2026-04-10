/**
 * Compatibility facade for semantic parameter-related type aliases.
 *
 * The concrete type declarations live in focused modules under `src/types`.
 */
export type { InputParameters, Parameters, ReservedParameters } from './Parameters';
export type {
    string_agent_hash,
    string_agent_name,
    string_agent_name_in_book,
    string_agent_permanent_id,
} from './string_agent_name';
export type { string_business_category_name } from './string_business_category_name';
export type { string_model_name } from './string_model_name';
export type {
    string_name,
    string_parameter_name,
    string_parameter_value,
    string_reserved_parameter_name,
} from './string_name';
export type { string_page, string_char } from './string_page';
export type {
    string_chat_prompt,
    string_completion_prompt,
    string_prompt,
    string_prompt_image,
    string_system_message,
    string_template,
    string_text_prompt,
} from './string_prompt';
export type { string_persona_description, string_model_description } from './string_persona_description';
export type { string_title } from './string_title';
