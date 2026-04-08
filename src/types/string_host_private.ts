/**
 * Semantic helper
 *
 * For example `"towns.cz"`
 *
 * @private internal utility of `string_url.ts`
 */
export type string_domain_private = string;

/**
 * Semantic helper
 *
 * For example `"https://*.pavolhejny.com/*"`
 *
 * @private internal utility of `string_url.ts`
 */
export type string_origin_private = string;

/**
 * Semantic helper
 *
 * For example `"com"`
 *
 * @private internal utility of `string_url.ts`
 */
export type string_tdl_private = string;

/**
 * Semantic helper
 *
 * For example `"localhost"` or `"collboard.com"`
 *
 * @private internal utility of `string_url.ts`
 */
export type string_hostname_private = string;

/**
 * Semantic helper
 *
 * For example `"localhost:9977"` or `"collboard.com"`
 *
 * @private internal utility of `string_url.ts`
 */
export type string_host_private = string;

/**
 * Semantic helper
 *
 * @private internal utility of `string_url.ts`
 */
export type string_protocol_private = 'http:' | 'https:';

/**
 * Semantic helper
 *
 * For example `"192.168.1.1"` (IPv4)
 * For example `"2001:0db8:85a3:0000:0000:8a2e:0370:7334"` (IPv6)
 *
 * @private internal utility of `string_url.ts`
 */
export type string_ip_address_private = string;
