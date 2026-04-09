import type {
    string_agent_url_private,
    string_base_url_private,
    string_pipeline_root_url_private,
    string_pipeline_url_private,
    string_pipeline_url_with_task_hash_private,
    string_promptbook_server_url_private,
    string_url_image_private,
    string_url_private,
} from './string_url_private';

/**
 * Compatibility facade for semantic URL-related type aliases.
 *
 * The concrete type declarations live in focused modules under `src/types`.
 */
export type { string_mime_type, string_mime_type_with_wildcard } from './string_mime_type';
export type { string_base64, string_data_url } from './string_base64';
export type {
    string_domain,
    string_host,
    string_hostname,
    string_ip_address,
    string_origin,
    string_protocol,
    string_tdl,
} from './string_host';
export type { string_href, string_uri, string_uri_part } from './string_href';
export type { string_email, string_emails } from './string_email';

/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi"`
 */
export type string_url = string_url_private;

/**
 * Semantic helper
 *
 * For example `"https://s1.ptbk.io/promptbook"`
 */
export type string_promptbook_server_url = string_promptbook_server_url_private;
// <- TODO: [🧠] Maybe split pipeline and agents server

/**
 * Semantic helper
 *
 * For example `"https://collboard.com"`
 */
export type string_base_url = string_base_url_private;

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/"`
 */
export type string_pipeline_root_url = string_pipeline_root_url_private;

/**
 * Semantic helper
 *
 * For example `"https://s6.ptbk.io/agents/agent-007"`
 */
export type string_agent_url = string_agent_url_private; // <- TODO: `${string}.book`

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.book"`
 */
export type string_pipeline_url = string_pipeline_url_private; // <- TODO: `${string}.book`

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.book#keywords"`
 */
export type string_pipeline_url_with_task_hash = string_pipeline_url_with_task_hash_private;

/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi.png?width=1200&height=630"`
 */
export type string_url_image = string_url_image_private;
