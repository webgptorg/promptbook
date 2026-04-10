import type { string_url_private } from './string_url_private';

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
export type { string_promptbook_server_url } from './string_promptbook_server_url';
export type { string_base_url } from './string_base_url';
export type { string_pipeline_root_url } from './string_pipeline_root_url';
export type { string_agent_url } from './string_agent_url';
export type { string_pipeline_url, string_pipeline_url_with_task_hash } from './string_pipeline_url';
export type { string_url_image } from './string_url_image';

/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi"`
 */
export type string_url = string_url_private;
