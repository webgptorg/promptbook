/**
 * Semantic helper
 *
 * For example `"text/plain"` or `"application/collboard"`
 */
export type string_mime_type = string;

/**
 * Semantic helper
 *
 * For example `"text/*"` or `"image/*"`
 *
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#unique_file_type_specifiers
 */
export type string_mime_type_with_wildcard = string;

/**
 * Semantic helper
 *
 * For example `"towns.cz"`
 */
export type string_domain = string;

/**
 * Semantic helper
 *
 * For example `"https://*.pavolhejny.com/*"`
 */
export type string_origin = string;

/**
 * Semantic helper
 *
 * For example `"com"`
 */
export type string_tdl = string;

/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi"`
 */
export type string_url = string;

/**
 * Semantic helper
 *
 * For example `"https://s1.ptbk.io/promptbook"`
 */
export type string_promptbook_server_url = string;
// <- TODO: [🧠] Maybe split pipeline and agents server

/**
 * Semantic helper
 *
 * For example `"https://collboard.com"`
 */
export type string_base_url = string;

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/"`
 */
export type string_pipeline_root_url = string;

/**
 * Semantic helper
 *
 * For example `"https://s6.ptbk.io/agents/agent-007"`
 */
export type string_agent_url = string; // <- TODO: `${string}.book`

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.book"`
 */
export type string_pipeline_url = string; // <- TODO: `${string}.book`

/**
 * Semantic helper
 *
 * For example `"https://promptbook.studio/webgpt/write-website-content-cs.book#keywords"`
 */
export type string_pipeline_url_with_task_hash = string;

/**
 * Semantic helper
 *
 * For example `"SGVsbG8sIFdvcmxkIQ=="`
 */
export type string_base64 = string;

/**
 * Semantic helper
 *
 * For example `"data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=="`
 */
export type string_data_url = `data:${string_mime_type};base64,${string_base64}`;

/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi"` OR `/9SeSQTupmQHwuSrLi`
 */
export type string_href = string;

/**
 * Semantic helper
 *
 * For example `"https://collboard.com/9SeSQTupmQHwuSrLi.png?width=1200&height=630"`
 */
export type string_url_image = string;

/**
 * Semantic helper
 *
 * For example `"/9SeSQTupmQHwuSrLi"`
 */
export type string_uri = string;

/**
 * Semantic helper
 *
 * For example `"9SeSQTupmQHwuSrLi"`
 */
export type string_uri_part = string;

/**
 * Semantic helper
 *
 * For example `"localhost"` or `"collboard.com"`
 */
export type string_hostname = string;

/**
 * Semantic helper
 *
 * For example `"localhost:9977"` or `"collboard.com"`
 */
export type string_host = string;

/**
 * Semantic helper
 */
export type string_protocol = 'http:' | 'https:';

/**
 * Semantic helper
 *
 * For example `"192.168.1.1"` (IPv4)
 * For example `"2001:0db8:85a3:0000:0000:8a2e:0370:7334"` (IPv6)
 */
export type string_ip_address = string;

/**
 * Semantic helper
 *
 * For example `"pavol@hejny.org"`
 */
export type string_email = string;

/**
 * Semantic helper
 *
 * For example `"pavol@hejny.org, jirka@webgpt.cz"`
 */
export type string_emails = string;
