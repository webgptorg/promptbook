import { string_url } from '../../types/typeAliases';

/**
 * Adds suffix to the URL
 *
 * @public exported from `@promptbook/utils`
 */
export function suffixUrl(value: URL, suffix: `/${string}`): string_url {
    const baseUrl = value.href.endsWith('/') ? value.href.slice(0, -1) : value.href;
    const normalizedSuffix = suffix.replace(/\/+/g, '/');
    return (baseUrl + normalizedSuffix) as string_url;
}
