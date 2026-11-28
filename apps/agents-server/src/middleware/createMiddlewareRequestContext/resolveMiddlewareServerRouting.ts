import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_TABLE_PREFIX } from '../../../config';
import { resolveCustomDomainAgent, type CustomDomainResolution } from '../../utils/customDomainRouting';
import { resolveRegisteredServerByHost, type ServerRecord } from '../../utils/serverRegistry';

/**
 * In-memory cache TTL for resolved custom-domain host mappings.
 *
 * @private function of createMiddlewareRequestContext
 */
const CUSTOM_DOMAIN_RESOLUTION_CACHE_TTL_MS = 120_000;

/**
 * Upper bound for one custom-domain resolution pass in middleware.
 *
 * @private function of createMiddlewareRequestContext
 */
const CUSTOM_DOMAIN_RESOLUTION_TIMEOUT_MS = 1_500;

/**
 * Hostname suffixes representing platform/system hosts where custom-domain
 * agent lookup should be skipped.
 *
 * @private function of createMiddlewareRequestContext
 */
const CUSTOM_DOMAIN_RESOLUTION_EXCLUDED_HOST_SUFFIXES = ['.vercel.app', '.vercel.sh'];

/**
 * Parameters required to resolve server/table routing for one middleware request.
 *
 * @private function of createMiddlewareRequestContext
 */
type ResolveMiddlewareServerRoutingOptions = {
    readonly host: string | null;
    readonly pathname: string;
    readonly registeredServers: ReadonlyArray<ServerRecord>;
    readonly supabase: SupabaseClient | null;
};

/**
 * Intermediate routing lookup state resolved for one request host.
 *
 * @private function of createMiddlewareRequestContext
 */
type MiddlewareServerRoutingContext = {
    readonly canQueryServerTables: boolean;
    readonly customDomainResolution: CustomDomainResolution | null;
    readonly tablePrefixForRequest: string;
};

/**
 * Cached custom-domain resolution records keyed by normalized request host.
 *
 * @private function of createMiddlewareRequestContext
 */
type CachedCustomDomainResolutionEntry = {
    readonly loadedAt: number;
    readonly resolution: CustomDomainResolution | null;
};

/**
 * Cached custom-domain resolution records keyed by normalized request host.
 *
 * @private function of createMiddlewareRequestContext
 */
const cachedCustomDomainResolutionByHost = new Map<string, CachedCustomDomainResolutionEntry>();

/**
 * In-flight custom-domain resolution promises keyed by normalized host to
 * deduplicate concurrent expensive lookups under bursty traffic.
 *
 * @private function of createMiddlewareRequestContext
 */
const inFlightCustomDomainResolutionByHost = new Map<string, Promise<CustomDomainResolution | null>>();

/**
 * Resolves server/table routing state for one incoming request.
 *
 * @param options - Host, pathname, and lookup dependencies.
 * @returns Routing context used by subsequent metadata and auth checks.
 *
 * @private function of createMiddlewareRequestContext
 */
export async function resolveMiddlewareServerRouting(
    options: ResolveMiddlewareServerRoutingOptions,
): Promise<MiddlewareServerRoutingContext> {
    const normalizedHost = normalizeMiddlewareHost(options.host);
    const registeredServer = resolveRegisteredServerByHost(options.host, options.registeredServers);
    const hasRegisteredServers = options.registeredServers.length > 0;
    let customDomainResolution: CustomDomainResolution | null = null;
    let effectiveTablePrefix: string | null = null;

    if (registeredServer) {
        effectiveTablePrefix = registeredServer.tablePrefix;
    } else if (
        options.host &&
        hasRegisteredServers &&
        options.supabase &&
        !shouldSkipCustomDomainResolution(normalizedHost, options.pathname)
    ) {
        try {
            customDomainResolution = await resolveCachedCustomDomainAgent({
                host: options.host,
                normalizedHost,
                registeredServers: options.registeredServers,
                supabase: options.supabase,
            });

            if (customDomainResolution) {
                effectiveTablePrefix = customDomainResolution.server.tablePrefix;
            }
        } catch (error) {
            console.error('Error resolving custom domain host in middleware:', error);
        }
    } else if (!hasRegisteredServers && options.host) {
        effectiveTablePrefix = SUPABASE_TABLE_PREFIX;
    }

    return {
        canQueryServerTables: Boolean(options.supabase && (!hasRegisteredServers || effectiveTablePrefix !== null)),
        customDomainResolution,
        tablePrefixForRequest:
            hasRegisteredServers && effectiveTablePrefix !== null ? effectiveTablePrefix : SUPABASE_TABLE_PREFIX,
    };
}

/**
 * Normalizes one host header value to a lower-cased hostname without port.
 *
 * @param host - Raw request host header.
 * @returns Normalized host or `null` when unavailable.
 *
 * @private function of createMiddlewareRequestContext
 */
function normalizeMiddlewareHost(host: string | null): string | null {
    if (!host) {
        return null;
    }

    const trimmedHost = host.trim().toLowerCase();
    if (!trimmedHost) {
        return null;
    }

    try {
        return normalizeMiddlewareHostname(new URL(`http://${trimmedHost}`).hostname.toLowerCase());
    } catch {
        const ipv6HostMatch = trimmedHost.match(/^\[(.+)\](?::\d+)?$/);

        if (ipv6HostMatch && ipv6HostMatch[1]) {
            return normalizeMiddlewareHostname(ipv6HostMatch[1].toLowerCase());
        }

        const hostWithoutPort = trimmedHost.split(':')[0];
        return normalizeMiddlewareHostname(hostWithoutPort);
    }
}

/**
 * Normalizes one parsed hostname value used by middleware host checks.
 *
 * @param hostname - Parsed hostname candidate.
 * @returns Normalized hostname, or `null` when empty.
 *
 * @private function of createMiddlewareRequestContext
 */
function normalizeMiddlewareHostname(hostname: string): string | null {
    const normalizedHostname = hostname
        .trim()
        .toLowerCase()
        .replace(/^\[(.*)\]$/u, '$1');
    return normalizedHostname || null;
}

/**
 * Checks whether one normalized host points to loopback.
 *
 * @param host - Normalized hostname.
 * @returns `true` when the host is one of the loopback aliases.
 *
 * @private function of createMiddlewareRequestContext
 */
function isLoopbackHost(host: string): boolean {
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/**
 * Checks whether one normalized host points to a private-network address.
 *
 * @param host - Normalized hostname.
 * @returns `true` when host belongs to a private network range.
 *
 * @private function of createMiddlewareRequestContext
 */
function isPrivateNetworkHost(host: string): boolean {
    if (host.endsWith('.local')) {
        return true;
    }

    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u);

    if (ipv4Match) {
        const octets = ipv4Match.slice(1).map((value) => Number(value));
        const [first, second] = octets;

        if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
            return false;
        }

        return (
            first === 10 ||
            first === 127 ||
            (first === 192 && second === 168) ||
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 169 && second === 254)
        );
    }

    if (!host.includes(':')) {
        return false;
    }

    const normalizedIpv6 = host.toLowerCase();
    return normalizedIpv6.startsWith('fc') || normalizedIpv6.startsWith('fd') || normalizedIpv6.startsWith('fe80:');
}

/**
 * Returns true when custom-domain resolution should be skipped for one request.
 *
 * @param host - Normalized request hostname.
 * @param pathname - Request pathname.
 * @returns `true` when middleware should avoid expensive custom-domain scans.
 *
 * @private function of createMiddlewareRequestContext
 */
function shouldSkipCustomDomainResolution(host: string | null, pathname: string): boolean {
    if (!host) {
        return true;
    }

    if (pathname.startsWith('/api/internal/')) {
        return true;
    }

    if (isLoopbackHost(host)) {
        return true;
    }

    if (process.env.NODE_ENV !== 'production' && isPrivateNetworkHost(host)) {
        return true;
    }

    return CUSTOM_DOMAIN_RESOLUTION_EXCLUDED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/**
 * Reads one cached custom-domain lookup when still within TTL.
 *
 * @param host - Normalized request hostname.
 * @returns Cached resolution (`null` for negative cache) or `undefined` when stale or missing.
 *
 * @private function of createMiddlewareRequestContext
 */
function readCachedCustomDomainResolution(host: string): CustomDomainResolution | null | undefined {
    const cachedResolution = cachedCustomDomainResolutionByHost.get(host);

    if (!cachedResolution) {
        return undefined;
    }

    if (Date.now() - cachedResolution.loadedAt >= CUSTOM_DOMAIN_RESOLUTION_CACHE_TTL_MS) {
        cachedCustomDomainResolutionByHost.delete(host);
        return undefined;
    }

    return cachedResolution.resolution;
}

/**
 * Stores one custom-domain resolution (including misses) for host-level TTL reuse.
 *
 * @param host - Normalized request hostname.
 * @param resolution - Resolved custom-domain mapping or `null` for miss.
 *
 * @private function of createMiddlewareRequestContext
 */
function writeCachedCustomDomainResolution(host: string, resolution: CustomDomainResolution | null): void {
    cachedCustomDomainResolutionByHost.set(host, {
        loadedAt: Date.now(),
        resolution,
    });
}

/**
 * Resolves one custom-domain mapping with a strict middleware timeout so edge
 * requests cannot block for long-running inheritance/import scans.
 *
 * @param host - Raw request host header.
 * @param supabase - Middleware Supabase client.
 * @param registeredServers - Cached server registry rows.
 * @returns Resolved mapping or `null` when unresolved or timed out.
 *
 * @private function of createMiddlewareRequestContext
 */
async function resolveCustomDomainAgentWithTimeout(
    host: string,
    supabase: SupabaseClient,
    registeredServers: ReadonlyArray<ServerRecord>,
): Promise<CustomDomainResolution | null> {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(null), CUSTOM_DOMAIN_RESOLUTION_TIMEOUT_MS);
    });

    try {
        return await Promise.race([resolveCustomDomainAgent(host, supabase, registeredServers), timeoutPromise]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}

/**
 * Resolves one custom-domain mapping with host-level TTL cache and in-flight
 * deduplication to avoid duplicate heavy scans during request bursts.
 *
 * @param options - Host normalization and Supabase dependencies.
 * @returns Resolved mapping or `null` when unresolved.
 *
 * @private function of createMiddlewareRequestContext
 */
async function resolveCachedCustomDomainAgent(options: {
    readonly host: string;
    readonly normalizedHost: string | null;
    readonly registeredServers: ReadonlyArray<ServerRecord>;
    readonly supabase: SupabaseClient;
}): Promise<CustomDomainResolution | null> {
    const normalizedHost = options.normalizedHost;

    if (!normalizedHost) {
        return resolveCustomDomainAgentWithTimeout(options.host, options.supabase, options.registeredServers);
    }

    const cachedCustomDomainResolution = readCachedCustomDomainResolution(normalizedHost);

    if (cachedCustomDomainResolution !== undefined) {
        return cachedCustomDomainResolution;
    }

    const inFlightCustomDomainResolution = inFlightCustomDomainResolutionByHost.get(normalizedHost);

    if (inFlightCustomDomainResolution) {
        return inFlightCustomDomainResolution;
    }

    const nextCustomDomainResolution = resolveCustomDomainAgentWithTimeout(
        options.host,
        options.supabase,
        options.registeredServers,
    )
        .then((resolution) => {
            writeCachedCustomDomainResolution(normalizedHost, resolution);
            return resolution;
        })
        .finally(() => {
            inFlightCustomDomainResolutionByHost.delete(normalizedHost);
        });

    inFlightCustomDomainResolutionByHost.set(normalizedHost, nextCustomDomainResolution);
    return nextCustomDomainResolution;
}
