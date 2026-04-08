import type { string_name_private } from './string_name_private';
import type { string_parameter_value_private } from './string_parameter_value_private';
import type { string_reserved_parameter_name_private } from './string_reserved_parameter_name_private';

/**
 * Semantic helper
 * Unique identifier of anything
 *
 * For example `"ainautes"`
 */
export type string_name = string_name_private;

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
export type string_parameter_value = string_parameter_value_private;

/**
 * Semantic helper
 * Unique identifier of reserved parameter
 *
 * For example `"context"`
 */
export type string_reserved_parameter_name = string_reserved_parameter_name_private;
