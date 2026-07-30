/**
 * Local Stalwart JMAP management endpoint used when `PTBK_STALWART_API_URL` is not configured.
 *
 * Stalwart publishes this path as `apiUrl` in its `/jmap/session` resource; it is the only endpoint
 * which accepts management method calls such as `x:Domain/query` or `x:Account/set`.
 */
export const STALWART_DEFAULT_API_URL = 'http://127.0.0.1:8080/jmap/';

/**
 * Path of the Stalwart JMAP management endpoint.
 */
const STALWART_JMAP_ENDPOINT_PATH = '/jmap/';

/**
 * Endpoint paths which never accept Stalwart management method calls and are therefore upgraded to
 * `STALWART_JMAP_ENDPOINT_PATH`.
 *
 * `/api` and `/api/` were written into `.env` by earlier Agents Server installations; Stalwart has no such
 * route and answered every management call with HTTP `404`. An empty path means only the Stalwart base URL
 * was configured.
 */
const STALWART_UPGRADED_ENDPOINT_PATHS = ['', '/', '/api', '/api/'];

/**
 * Resolves the Stalwart JMAP management endpoint from the configured `PTBK_STALWART_API_URL` value.
 *
 * A value which cannot be parsed as a URL is returned unchanged so that the failing management call reports
 * the configured value back to the administrator.
 */
export function resolveStalwartApiUrl(configuredApiUrl: string | null | undefined): string {
    const trimmedApiUrl = configuredApiUrl?.trim();

    if (!trimmedApiUrl) {
        return STALWART_DEFAULT_API_URL;
    }

    let apiUrl: URL;
    try {
        apiUrl = new URL(trimmedApiUrl);
    } catch {
        return trimmedApiUrl;
    }

    if (!STALWART_UPGRADED_ENDPOINT_PATHS.includes(apiUrl.pathname)) {
        return trimmedApiUrl;
    }

    apiUrl.pathname = STALWART_JMAP_ENDPOINT_PATH;
    return apiUrl.href;
}
