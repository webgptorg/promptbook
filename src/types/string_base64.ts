import type { string_base64_private, string_data_url_private } from './string_base64_private';

/**
 * Semantic helper
 *
 * For example `"SGVsbG8sIFdvcmxkIQ=="`
 */
export type string_base64 = string_base64_private;

/**
 * Semantic helper
 *
 * For example `"data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=="`
 */
export type string_data_url = string_data_url_private;
