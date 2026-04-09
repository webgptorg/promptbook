import type { string_mime_type_private } from './string_mime_type_private';

/**
 * Semantic helper
 *
 * For example `"SGVsbG8sIFdvcmxkIQ=="`
 *
 * @private internal utility of `string_base64.ts`
 */
export type string_base64_private = string;

/**
 * Semantic helper
 *
 * For example `"data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=="`
 *
 * @private internal utility of `string_base64.ts`
 */
export type string_data_url_private = `data:${string_mime_type_private};base64,${string_base64_private}`;
