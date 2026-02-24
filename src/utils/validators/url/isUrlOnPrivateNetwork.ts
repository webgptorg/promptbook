import type { string_url } from '../../../types/typeAliases';
import { isHostnameOnPrivateNetwork, type IsHostnameOnPrivateNetworkOptions } from './isHostnameOnPrivateNetwork';

/**
 * Options for `isUrlOnPrivateNetwork`
 */
export type IsUrlOnPrivateNetworkOptions = IsHostnameOnPrivateNetworkOptions;

/**
 * Checks if an IP address or hostname is reserved for private networks or localhost.
 *
 * Note: There are two similar functions:
 * - `isUrlOnPrivateNetwork` *(this one)* which tests full URL
 * - `isHostnameOnPrivateNetwork` which tests just hostname
 *
 * @param {string} url - The URL to check.
 * @param {IsUrlOnPrivateNetworkOptions} options - Options for the check.
 * @returns {boolean} Returns true if the IP address is reserved for private networks or localhost, otherwise false.
 * @public exported from `@promptbook/utils`
 */
export function isUrlOnPrivateNetwork(url: URL | string_url, options: IsUrlOnPrivateNetworkOptions = {}): boolean {
    if (typeof url === 'string') {
        url = new URL(url);
    }
    return isHostnameOnPrivateNetwork(url.hostname, options);
}
