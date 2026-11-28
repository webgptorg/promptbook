import type { string_char_private } from './string_char_private';
import type { string_page_private } from './string_page_private';

/**
 * Semantic helper
 *
 * For example `"index"` or `"explanation"`
 * Always in kebab-case
 */
export type string_page = string_page_private;

/**
 * Semantic helper
 *
 * For example `"a"`
 */
export type string_char = string_char_private;
