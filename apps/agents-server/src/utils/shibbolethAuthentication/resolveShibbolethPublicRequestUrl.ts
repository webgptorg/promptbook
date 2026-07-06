/**
 * HTTP protocols accepted from proxy forwarding headers.
 */
const SHIBBOLETH_FORWARDED_PROTOCOLS = new Set(['http', 'https']);

/**
 * Local hostnames that should keep their request protocol in development.
 */
const SHIBBOLETH_LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Resolves the externally visible URL for one Shibboleth route request.
 *
 * @param request - Route-handler request received by the Agents Server.
 * @returns Public request URL reconstructed from trusted reverse-proxy headers when present.
 *
 * @private function of `shibbolethAuthentication`
 */
export function resolveShibbolethPublicRequestUrl(request: Request): string {
    const publicRequestUrl = new URL(request.url);
    const forwardedHost = getFirstHeaderValue(request.headers.get('x-forwarded-host'));
    const requestHost = getFirstHeaderValue(request.headers.get('host'));
    const host = forwardedHost || requestHost;

    if (host) {
        publicRequestUrl.host = host;
        if (!hasExplicitPort(host)) {
            publicRequestUrl.port = '';
        }
    }

    publicRequestUrl.protocol = resolvePublicProtocol({
        forwardedProtocol: getFirstHeaderValue(request.headers.get('x-forwarded-proto')),
        fallbackProtocol: publicRequestUrl.protocol,
        host: host || publicRequestUrl.host,
    });

    return publicRequestUrl.toString();
}

/**
 * Returns the first value from a comma-separated forwarding header.
 *
 * @param value - Raw header value.
 * @returns First trimmed value, or `null` when empty.
 */
function getFirstHeaderValue(value: string | null): string | null {
    return value?.split(',')[0]?.trim() || null;
}

/**
 * Checks whether one host header explicitly carries a port.
 *
 * @param host - Request or forwarded host.
 * @returns `true` when the host includes a non-implicit port segment.
 */
function hasExplicitPort(host: string): boolean {
    const trimmedHost = host.trim();

    return /^\[[^\]]+\]:\d+$/u.test(trimmedHost) || /^[^:]+:\d+$/u.test(trimmedHost);
}

/**
 * Resolves the public protocol for a Shibboleth request URL.
 *
 * @param options - Forwarded protocol, fallback protocol, and public host.
 * @returns Protocol string ending with `:`.
 */
function resolvePublicProtocol(options: {
    readonly forwardedProtocol: string | null;
    readonly fallbackProtocol: string;
    readonly host: string;
}): string {
    const normalizedForwardedProtocol = options.forwardedProtocol?.toLowerCase();

    if (normalizedForwardedProtocol && SHIBBOLETH_FORWARDED_PROTOCOLS.has(normalizedForwardedProtocol)) {
        return `${normalizedForwardedProtocol}:`;
    }

    if (!isLocalDevelopmentHost(options.host)) {
        return 'https:';
    }

    return options.fallbackProtocol;
}

/**
 * Checks whether the host should be treated as local development.
 *
 * @param host - Request or forwarded host.
 * @returns `true` for localhost and loopback hosts.
 */
function isLocalDevelopmentHost(host: string): boolean {
    const hostname = host
        .trim()
        .toLowerCase()
        .replace(/^\[(.+)\](?::\d+)?$/u, '$1')
        .replace(/:\d+$/u, '');

    return SHIBBOLETH_LOCAL_HOSTNAMES.has(hostname);
}
