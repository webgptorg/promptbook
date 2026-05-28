/**
 * Request-independent context used to decide whether standalone VPS setup should
 * continue allowing raw-IP bootstrap access.
 */
export type StandaloneVpsRawIpBootstrapContext = {
    /**
     * Current canonical public site URL stored in the environment.
     */
    readonly nextPublicSiteUrl: string | null | undefined;

    /**
     * Known public IPv4/IPv6 address of the standalone VPS.
     */
    readonly publicIpAddress: string | null | undefined;
};

/**
 * Returns whether the standalone VPS should keep allowing raw-IP bootstrap access.
 *
 * This stays enabled while the canonical public site URL still points to the VPS
 * raw IP over plain HTTP, which means domain activation has not completed yet.
 */
export function isStandaloneVpsRawIpBootstrapActive(context: StandaloneVpsRawIpBootstrapContext): boolean {
    const parsedPublicSiteUrl = parseAbsoluteHttpUrl(context.nextPublicSiteUrl);
    if (!parsedPublicSiteUrl || parsedPublicSiteUrl.protocol !== 'http:') {
        return false;
    }

    const normalizedSiteHost = normalizeHost(parsedPublicSiteUrl.host);
    if (!normalizedSiteHost || !isIpAddressHost(normalizedSiteHost)) {
        return false;
    }

    const normalizedConfiguredPublicIpAddress = normalizeHost(context.publicIpAddress || '');
    if (normalizedConfiguredPublicIpAddress && normalizedSiteHost !== normalizedConfiguredPublicIpAddress) {
        return false;
    }

    return true;
}

/**
 * Parses one absolute HTTP(S) URL from environment configuration.
 *
 * @param value - Raw environment value.
 * @returns Parsed URL or `null` when missing/invalid.
 */
function parseAbsoluteHttpUrl(value: string | null | undefined): URL | null {
    if (!value) {
        return null;
    }

    try {
        const parsedUrl = new URL(value);

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return null;
        }

        return parsedUrl;
    } catch {
        return null;
    }
}

/**
 * Removes ports and IPv6 brackets from host-like strings.
 *
 * @param host - Raw host header value.
 * @returns Normalized bare hostname or IP address.
 */
function normalizeHost(host: string | null | undefined): string {
    return (host || '')
        .trim()
        .replace(/^\[(.+)\](?::\d+)?$/u, '$1')
        .replace(/:\d+$/u, '');
}

/**
 * Checks whether a host string points to a raw IPv4 or IPv6 address.
 *
 * @param host - Host header or hostname.
 * @returns `true` when the host is a raw IP address.
 */
function isIpAddressHost(host: string): boolean {
    return /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(host) || host.includes(':');
}
