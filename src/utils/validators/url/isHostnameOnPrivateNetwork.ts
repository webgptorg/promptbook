import type { string_hostname } from '../../../types/typeAliases';

/**
 * Options for `isHostnameOnPrivateNetwork`
 */
export type IsHostnameOnPrivateNetworkOptions = {
    /**
     * Whether to allow localhost
     *
     * @default false
     */
    readonly allowLocalhost?: boolean;
};

/**
 * Checks if an URL is reserved for private networks or localhost.
 *
 * Note: There are two similar functions:
 * - `isUrlOnPrivateNetwork` which tests full URL
 * - `isHostnameOnPrivateNetwork` *(this one)* which tests just hostname
 *
 * @public exported from `@promptbook/utils`
 */
export function isHostnameOnPrivateNetwork(
    hostname: string_hostname,
    options: IsHostnameOnPrivateNetworkOptions = {},
): boolean {
    const { allowLocalhost = false } = options;

    if (
        hostname === 'example.com' ||
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.test') ||
        hostname === '127.0.0.1' ||
        hostname === '::1'
    ) {
        return !allowLocalhost;
    }
    if (hostname.includes(':')) {
        // IPv6
        const ipParts = hostname.split(':');
        return ipParts[0]! === 'fc00' || ipParts[0]! === 'fd00' || ipParts[0]! === 'fe80';
    } else {
        // IPv4
        const ipParts = hostname.split('.').map((part) => Number.parseInt(part, 10));
        return (
            ipParts[0]! === 10 ||
            (ipParts[0]! === 172 && ipParts[1]! >= 16 && ipParts[1]! <= 31) ||
            (ipParts[0]! === 192 && ipParts[1]! === 168)
        );
    }
}
