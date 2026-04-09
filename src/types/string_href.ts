import type { string_href_private, string_uri_part_private, string_uri_private } from './string_url_private';

/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi"` OR `/9SeSQTupmQHwuSrLi`
 */
export type string_href = string_href_private;

/**
 * Semantic helper
 *
 * For example `"/9SeSQTupmQHwuSrLi"`
 */
export type string_uri = string_uri_private;

/**
 * Semantic helper
 *
 * For example `"9SeSQTupmQHwuSrLi"`
 */
export type string_uri_part = string_uri_part_private;
