import type { string_title } from './string_parameter_name';

/**
 * Semantic helper
 *
 * For example `"John Smith"`
 */
export type string_person_fullname = `${string_person_firstname} ${string_person_lastname}` | string;

/**
 * Semantic helper
 *
 * For example `"John Smith"`
 */
export type string_person_firstname = string;

/**
 * Semantic helper
 *
 * For example `"John Smith"`
 */
export type string_person_lastname = string;

/**
 * Semantic helper
 * Full profile of the person with his email and web (like in package.json)
 *
 * For example `"Pavol Hejný <pavol@hejny.org> (https://pavolhejny.com)"`
 */
export type string_person_profile = string;

/**
 * Semantic helper
 *
 * For example `"MIT"`
 */
export type string_license = string;

/**
 * Semantic helper
 *
 * For example `"Pavol Hejný <pavol@ptbk.io> (https://www.pavolhejny.com/)"`
 * For example `"AI Web, LLC <legal@ptbk.io> (https://www.ptbk.io/)"`
 */
export type string_legal_entity = string | string_person_profile | string_title;

/**
 * Semantic helper for attributes
 *
 * - case insensitive
 *
 * For example `"color"`
 */
export type string_attribute = string; // TODO: Probably move where is AttributesManager

/**
 * Semantic helper for attributes context
 * Each attribute value scope with a attribute name has its own current value
 *
 * - case insensitive
 *
 * For example `"tools"`
 */
export type string_attribute_value_scope = string; // TODO: Probably move where is AttributesManager

/**
 * Semantic helper for css/html colors
 *
 * For example `"white"` or `"#009edd"`
 */
export type string_color = string;

/**
 * Semantic helper; For example "SHARE_ICON/EDIT_LINK"
 */
export type string_translate_name = string;

/**
 * Semantic helper; For example "ShareIcon/ edit link"
 */
export type string_translate_name_not_normalized = string;

/**
 * Semantic helper; For example "cs" or "en"
 * Implementing ISO 639-1
 *
 * TODO: Probably use enum
 */
export type string_translate_language = 'en' | 'cs';

/**
 * Semantic helper; For example "callbackName" or "renderMe"
 */
export type string_javascript_name = string;

/**
 * Semantic helper; For example "unwrapResult" or "spaceTrim"
 */
export type string_postprocessing_function_name = string;
