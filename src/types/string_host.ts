import type {
    string_domain_private,
    string_host_private,
    string_hostname_private,
    string_ip_address_private,
    string_origin_private,
    string_protocol_private,
    string_tdl_private,
} from './string_host_private';

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
