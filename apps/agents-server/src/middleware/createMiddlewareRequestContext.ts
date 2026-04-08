import type { TODO_any } from '@promptbook-local/types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { SUPABASE_TABLE_PREFIX } from '../../config';
import { isIpAllowed } from '../utils/isIpAllowed';
import {
    listRegisteredServersUsingServiceRole,
    resolveRegisteredServerByHost,
    type ServerRecord,
} from '../utils/serverRegistry';
import { resolveCustomDomainAgent, type CustomDomainResolution } from '../utils/customDomainRouting';
import {
    DEFAULT_SERVER_VISIBILITY,
    parseServerVisibility,
    SERVER_VISIBILITY_METADATA_KEY,
    type ServerVisibility,
} from '../utils/serverVisibility';

/**
 * In-memory cache TTL for middleware metadata lookups.
 *
 * @private function of createMiddlewareRequestContext
 */
const MIDDLEWARE_METADATA_CACHE_TTL_MS = 120_000;

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
 * Parsed middleware metadata entry.
 *
 * @private function of createMiddlewareRequestContext
 */
type MiddlewareMetadataCacheEntry = {
    readonly loadedAt: number;
    readonly allowedIps: string | null;
    readonly embeddingAllowed: string | null;
    readonly serverVisibility: string | null;
};

/**
 * Cached metadata results keyed by table prefix.
 *
 * @private function of createMiddlewareRequestContext
 */
const cachedMiddlewareMetadataByTablePrefix = new Map<string, MiddlewareMetadataCacheEntry>();

/**
 * Cached custom-domain resolution records keyed by normalized request host.
 *
 * @private function of createMiddlewareRequestContext
 */
const cachedCustomDomainResolutionByHost = new Map<
    string,
    {
        readonly loadedAt: number;
        readonly resolution: CustomDomainResolution | null;
    }
>();

/**
 * In-flight custom-domain resolution promises keyed by normalized host to
 * deduplicate concurrent expensive lookups under bursty traffic.
 *
 * @private function of createMiddlewareRequestContext
 */
const inFlightCustomDomainResolutionByHost = new Map<string, Promise<CustomDomainResolution | null>>();

/**
 * Cached Supabase client singleton for middleware.
 *
 * @private function of createMiddlewareRequestContext
 */
let cachedMiddlewareSupabase: SupabaseClient | null = null;

/**
 * Derived request-scoped middleware context used by the top-level middleware.
 *
 * @private function of createMiddlewareRequestContext
 */
type MiddlewareRequestContext = {
    readonly canQueryServerTables: boolean;
    readonly customDomainResolution: CustomDomainResolution | null;
    readonly isAccessRestricted: boolean;
    readonly isEmbeddingAllowed: boolean;
    readonly serverVisibility: ServerVisibility;
    readonly supabase: SupabaseClient | null;
    readonly tablePrefixForRequest: string;
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
 * Metadata values loaded for one request.
 *
 * @private function of createMiddlewareRequestContext
 */
type MiddlewareMetadata = {
    readonly allowedIps: string | null;
    readonly embeddingAllowed: string | null;
    readonly serverVisibility: string | null;
};

/**
 * Builds the derived middleware context needed for access checks and routing.
 *
 * @param request - Incoming middleware request.
 * @returns Request-scoped middleware context.
 *
 * @private function of middleware
 */
export async function createMiddlewareRequestContext(request: NextRequest): Promise<MiddlewareRequestContext> {
    const requestIp = getRequestIp(request);
    const host = request.headers.get('host');
    const normalizedHost = normalizeMiddlewareHost(host);
    const supabase = getMiddlewareSupabase();
    const registeredServers = supabase ? await loadRegisteredServers() : [];
    const { canQueryServerTables, customDomainResolution, tablePrefixForRequest } = await resolveMiddlewareServerRouting(
        {
            host,
            normalizedHost,
            pathname: request.nextUrl.pathname,
            registeredServers,
            supabase,
        },
    );
    const middlewareMetadata = await loadMiddlewareMetadata({
        supabase,
        canQueryServerTables,
        tablePrefixForRequest,
    });
    const allowedIps =
        middlewareMetadata.allowedIps !== null && middlewareMetadata.allowedIps !== undefined
            ? middlewareMetadata.allowedIps
            : process.env.RESTRICT_IP;
    const isEmbeddingAllowed = parseBooleanMetadataValue(middlewareMetadata.embeddingAllowed, true);
    const serverVisibility = parseServerVisibility(
        process.env.SERVER_VISIBILITY || middlewareMetadata.serverVisibility,
        DEFAULT_SERVER_VISIBILITY,
    );
    const isValidToken = await isRequestAuthorizedByApiToken({
        canQueryServerTables,
        request,
        supabase,
        tablePrefixForRequest,
    });
    const isLoggedIn = request.cookies.has('sessionToken');
    const isAccessRestricted = !isIpAllowed(requestIp, allowedIps) && !isLoggedIn && !isValidToken;

    return {
        canQueryServerTables,
        customDomainResolution,
        isAccessRestricted,
        isEmbeddingAllowed,
        serverVisibility,
        supabase,
        tablePrefixForRequest,
    };
}

/**
 * Returns a shared Supabase client for middleware or `null` when env vars are missing.
 *
 * @returns Shared middleware Supabase client when configured.
 *
 * @private function of createMiddlewareRequestContext
 */
function getMiddlewareSupabase(): SupabaseClient | null {
    if (cachedMiddlewareSupabase) {
        return cachedMiddlewareSupabase;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    cachedMiddlewareSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    return cachedMiddlewareSupabase;
}

/**
 * Reads the client IP from the request using the same fallback order as before.
 *
 * @param request - Incoming middleware request.
 * @returns Best-effort client IP address.
 *
 * @private function of createMiddlewareRequestContext
 */
function getRequestIp(request: NextRequest): string {
    let requestIp = (request as TODO_any).ip;
    const xForwardedFor = request.headers.get('x-forwarded-for');

    if (!requestIp && xForwardedFor) {
        const forwardedIp = xForwardedFor.split(',')[0];
        if (forwardedIp) {
            requestIp = forwardedIp.trim();
        }
    }

    return requestIp || '127.0.0.1';
}

/**
 * Loads registered servers while preserving the middleware fallback behavior on failure.
 *
 * @returns Registered servers, or an empty list when unavailable.
 *
 * @private function of createMiddlewareRequestContext
 */
async function loadRegisteredServers(): Promise<Array<ServerRecord>> {
    try {
        return await listRegisteredServersUsingServiceRole();
    } catch (error) {
        console.error('Error loading server registry in middleware:', error);
        return [];
    }
}

/**
 * Resolves server/table routing state for one incoming request.
 *
 * @param options - Host, pathname, and lookup dependencies.
 * @returns Routing context used by subsequent metadata and auth checks.
 *
 * @private function of createMiddlewareRequestContext
 */
async function resolveMiddlewareServerRouting(options: {
    readonly host: string | null;
    readonly normalizedHost: string | null;
    readonly pathname: string;
    readonly registeredServers: ReadonlyArray<ServerRecord>;
    readonly supabase: SupabaseClient | null;
}): Promise<MiddlewareServerRoutingContext> {
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
        !shouldSkipCustomDomainResolution(options.normalizedHost, options.pathname)
    ) {
        try {
            customDomainResolution = await resolveCachedCustomDomainAgent({
                host: options.host,
                normalizedHost: options.normalizedHost,
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
 * Loads metadata values for the current request when the relevant server tables are queryable.
 *
 * @param options - Supabase client and table-routing state.
 * @returns Metadata values used by access and header policies.
 *
 * @private function of createMiddlewareRequestContext
 */
async function loadMiddlewareMetadata(options: {
    readonly supabase: SupabaseClient | null;
    readonly canQueryServerTables: boolean;
    readonly tablePrefixForRequest: string;
}): Promise<MiddlewareMetadata> {
    if (!options.supabase || !options.canQueryServerTables) {
        return {
            allowedIps: null,
            embeddingAllowed: null,
            serverVisibility: null,
        };
    }

    return loadCachedMiddlewareMetadata(options.supabase, options.tablePrefixForRequest);
}

/**
 * Loads metadata values for one table prefix with a short TTL cache.
 *
 * @param supabase - Supabase client used to query metadata.
 * @param tablePrefix - Table prefix for the current server.
 * @returns Cached metadata values for access and visibility checks.
 *
 * @private function of createMiddlewareRequestContext
 */
async function loadCachedMiddlewareMetadata(
    supabase: SupabaseClient,
    tablePrefix: string,
): Promise<MiddlewareMetadata> {
    const normalizedTablePrefix = tablePrefix.trim();
    const cachedMiddlewareMetadata = cachedMiddlewareMetadataByTablePrefix.get(normalizedTablePrefix);

    if (cachedMiddlewareMetadata && Date.now() - cachedMiddlewareMetadata.loadedAt < MIDDLEWARE_METADATA_CACHE_TTL_MS) {
        return {
            allowedIps: cachedMiddlewareMetadata.allowedIps,
            embeddingAllowed: cachedMiddlewareMetadata.embeddingAllowed,
            serverVisibility: cachedMiddlewareMetadata.serverVisibility,
        };
    }

    let allowedIps: string | null = null;
    let embeddingAllowed: string | null = null;
    let serverVisibility: string | null = null;

    try {
        const { data } = await supabase
            .from(`${tablePrefix}Metadata`)
            .select('key, value')
            .in('key', ['RESTRICT_IP', 'IS_EMBEDDING_ALLOWED', SERVER_VISIBILITY_METADATA_KEY]);

        if (Array.isArray(data)) {
            for (const row of data) {
                const key = row?.key;
                const value = row?.value;

                if (key === 'RESTRICT_IP' && typeof value === 'string' && value !== '') {
                    allowedIps = value;
                }
                if (key === 'IS_EMBEDDING_ALLOWED' && typeof value === 'string') {
                    embeddingAllowed = value;
                }
                if (key === SERVER_VISIBILITY_METADATA_KEY && typeof value === 'string') {
                    serverVisibility = value;
                }
            }
        }
    } catch (error) {
        console.error('Error fetching metadata in middleware:', error);
    }

    cachedMiddlewareMetadataByTablePrefix.set(normalizedTablePrefix, {
        allowedIps,
        embeddingAllowed,
        loadedAt: Date.now(),
        serverVisibility,
    });

    return {
        allowedIps,
        embeddingAllowed,
        serverVisibility,
    };
}

/**
 * Validates a bearer API token against the current server tables.
 *
 * @param options - Token-validation dependencies.
 * @returns `true` when a non-revoked token exists for the request.
 *
 * @private function of createMiddlewareRequestContext
 */
async function isRequestAuthorizedByApiToken(options: {
    readonly canQueryServerTables: boolean;
    readonly request: NextRequest;
    readonly supabase: SupabaseClient | null;
    readonly tablePrefixForRequest: string;
}): Promise<boolean> {
    const authHeader = options.request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    const token = authHeader.split(' ')[1];
    if (!token || !token.startsWith('ptbk_') || !options.supabase || !options.canQueryServerTables) {
        return false;
    }

    try {
        const { data } = await options.supabase
            .from(`${options.tablePrefixForRequest}ApiTokens`)
            .select('id')
            .eq('token', token)
            .eq('isRevoked', false)
            .single();

        return Boolean(data);
    } catch (error) {
        console.error('Error validating token in middleware:', error);
        return false;
    }
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
    const normalizedHostname = hostname.trim().toLowerCase().replace(/^\[(.*)\]$/u, '$1');
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

/**
 * Parses boolean metadata values, falling back when the stored value is missing or unrecognized.
 *
 * @param raw - Raw metadata text.
 * @param fallback - Value used when the metadata does not contain a usable boolean.
 * @returns Parsed boolean setting.
 *
 * @private function of createMiddlewareRequestContext
 */
function parseBooleanMetadataValue(raw: string | null | undefined, fallback: boolean): boolean {
    if (!raw) {
        return fallback;
    }

    const normalized = raw.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
        return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
        return false;
    }

    return fallback;
}
