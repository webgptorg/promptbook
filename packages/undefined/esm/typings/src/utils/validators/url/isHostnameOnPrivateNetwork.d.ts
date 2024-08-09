import type { string_hostname } from '../../../types/typeAliases';
/**
 * Checks if an URL is reserved for private networks or localhost.
 *
 * Note: There are two simmilar functions:
 * - `isUrlOnPrivateNetwork` which tests full URL
 * - `isHostnameOnPrivateNetwork` *(this one)* which tests just hostname
 *
 * @public exported from `@promptbook/utils`
 */
export declare function isHostnameOnPrivateNetwork(hostname: string_hostname): boolean;
