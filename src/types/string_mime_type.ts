import type { string_mime_type_private, string_mime_type_with_wildcard_private } from './string_mime_type_private';

/**
 * Semantic helper
 *
 * For example `"text/plain"` or `"application/collboard"`
 */
export type string_mime_type = string_mime_type_private;

/**
 * Semantic helper
 *
 * For example `"text/*"` or `"image/*"`
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#unique_file_type_specifiers
 */
export type string_mime_type_with_wildcard = string_mime_type_with_wildcard_private;
