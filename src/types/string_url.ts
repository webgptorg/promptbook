import type { string_base64_private, string_data_url_private } from './string_base64_private';
import type {
    string_domain_private,
    string_host_private,
    string_hostname_private,
    string_ip_address_private,
    string_origin_private,
    string_protocol_private,
    string_tdl_private,
} from './string_host_private';
import type { string_email_private, string_emails_private } from './string_email_private';
import type { string_mime_type_private, string_mime_type_with_wildcard_private } from './string_mime_type_private';
import type {
    string_agent_url_private,
    string_base_url_private,
    string_href_private,
    string_pipeline_root_url_private,
    string_pipeline_url_private,
    string_pipeline_url_with_task_hash_private,
    string_promptbook_server_url_private,
    string_uri_part_private,
    string_uri_private,
    string_url_image_private,
    string_url_private,
} from './string_url_private';

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

/**
 * Semantic helper
 *
 * For example `"towns.cz"`
 */
export type string_domain = string_domain_private;

/**
 * Semantic helper
 *
 * For example `"https://*.pavolhejny.com/*"`
 */
export type string_origin = string_origin_private;

/**
 * Semantic helper
 *
 * For example `"com"`
 */
export type string_tdl = string_tdl_private;

/**
 * Semantic helper
 *
 * For example `"localhost"` or `"collboard.com"`
 */
export type string_hostname = string_hostname_private;

/**
 * Semantic helper
 *
 * For example `"localhost:9977"` or `"collboard.com"`
 */
export type string_host = string_host_private;

/**
 * Semantic helper
 */
export type string_protocol = string_protocol_private;

/**
 * Semantic helper
 *
 * For example `"192.168.1.1"` (IPv4)
 * For example `"2001:0db8:85a3:0000:0000:8a2e:0370:7334"` (IPv6)
 */
export type string_ip_address = string_ip_address_private;

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
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi"` OR `/9SeSQTupmQHwuSrLi`
 */
export type string_href = string_href_private;

/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi.png?width=1200&height=630"`
 */
export type string_url_image = string_url_image_private;

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

/**
 * Semantic helper
 *
 * For example `"pavol@hejny.org"`
 */
export type string_email = string_email_private;

/**
 * Semantic helper
 *
 * For example `"pavol@hejny.org, jirka@webgpt.cz"`
 */
export type string_emails = string_emails_private;
