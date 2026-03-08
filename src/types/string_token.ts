import type { string_email } from './string_url';

/**
 * Generic identifier helper.
 */
export type id = string | number;

/**
 * Task identifier helper.
 */
export type task_id = string;

/**
 * Token string helper.
 */
export type string_token = string;

/**
 * Semantic helper
 *
 * Made by `identificationToPromptbookToken` exported from `@promptbook/core`
 */
export type string_promptbook_token = string_token;

/**
 * License token helper.
 */
export type string_license_token = string_token;

/**
 * Password helper.
 */
export type string_password = string;

/**
 * SSH key helper.
 */
export type string_ssh_key = string;

/**
 * PGP key helper.
 */
export type string_pgp_key = string;

/**
 * Language as a string, e.g. 'en-US', 'cs-CZ', 'en'
 */
export type string_language = string;

/**
 * Semantic helper for `Date.toISOString()` result
 *
 * @example "2011-10-05T14:48:00.000Z".
 * @see https://en.wikipedia.org/wiki/ISO_8601
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
 */
export type string_date_iso8601 = `${number}-${number}-${number}${string}${number}:${number}:${number}${string}`;

/**
 * Application identifier, used to distinguish different apps or clients.
 *
 * For example: 'cli', 'playground', or a custom app id.
 */
export type string_app_id = id | 'app';

/**
 * End user identifier, can be a user id or email address.
 * Used for tracking and abuse prevention.
 */
export type string_user_id = id | string_email;
