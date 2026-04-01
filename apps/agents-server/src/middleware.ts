import { TODO_any } from '@promptbook-local/types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_TABLE_PREFIX } from '../config';
import { RESERVED_PATHS } from './generated/reservedPaths';
import { buildAgentNameOrIdFilter } from './utils/agentIdentifier';
import { isAgentVisibility, isPublicAgentVisibility, type AgentVisibility } from './utils/agentVisibility';
import { resolveCustomDomainAgent, type CustomDomainResolution } from './utils/customDomainRouting';
import { isIpAllowed } from './utils/isIpAllowed';
import {
    listRegisteredServersUsingServiceRole,
    resolveRegisteredServerByHost,
    type ServerRecord,
} from './utils/serverRegistry';
import {
    DEFAULT_SERVER_VISIBILITY,
    isPublicServerVisibility,
    parseServerVisibility,
    SERVER_VISIBILITY_METADATA_KEY,
    type ServerVisibility,
} from './utils/serverVisibility';

/**
 * In-memory cache TTL for middleware metadata lookups.
 *
 * @private internal middleware utility
 */
const MIDDLEWARE_METADATA_CACHE_TTL_MS = 30_000;

/**
 * Cached metadata result keyed by table prefix.
 *
 * @private internal middleware singleton
 */
let cachedMiddlewareMetadata: {
    readonly loadedAt: number;
    readonly tablePrefix: string;
    readonly allowedIps: string | null;
    readonly embeddingAllowed: string | null;
    readonly serverVisibility: string | null;
} | null = null;

/**
 * Cached Supabase client singleton for middleware.
 *
 * @private internal middleware singleton
 */
let cachedMiddlewareSupabase: SupabaseClient | null = null;

/**
 * Returns a shared Supabase client for middleware or `null` when env vars are missing.
 *
 * @private internal middleware utility
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
 * Loads metadata values for one table prefix with a short TTL cache.
 *
 * @private internal middleware utility
 */
async function loadCachedMiddlewareMetadata(
    supabase: SupabaseClient,
    tablePrefix: string,
): Promise<{
    allowedIps: string | null;
    embeddingAllowed: string | null;
    serverVisibility: string | null;
}> {
    if (
        cachedMiddlewareMetadata &&
        cachedMiddlewareMetadata.tablePrefix === tablePrefix &&
        Date.now() - cachedMiddlewareMetadata.loadedAt < MIDDLEWARE_METADATA_CACHE_TTL_MS
    ) {
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

    cachedMiddlewareMetadata = {
        loadedAt: Date.now(),
        tablePrefix,
        allowedIps,
        embeddingAllowed,
        serverVisibility,
    };

    return { allowedIps, embeddingAllowed, serverVisibility };
}

export async function middleware(req: NextRequest) {
    // 1. Get client IP
    let ip = (req as TODO_any).ip;
    const xForwardedFor = req.headers.get('x-forwarded-for');
    if (!ip && xForwardedFor) {
        const forwardedIp = xForwardedFor.split(',')[0];
        if (forwardedIp) {
            ip = forwardedIp.trim();
        }
    }
    // Fallback for local development if needed, though req.ip is usually ::1 or 127.0.0.1
    ip = ip || '127.0.0.1';

    // 2. Determine allowed IPs
    // Priority: Metadata > Environment Variable

    const allowedIpsEnv = process.env.RESTRICT_IP;
    let allowedIpsMetadata: string | null = null;
    let embeddingAllowedMetadata: string | null = null;
    let serverVisibilityMetadata: string | null = null;

    const host = req.headers.get('host');
    const supabase = getMiddlewareSupabase();

    // [🧠] Use 10s-cached server registry to avoid hammering DB on every request
    let registeredServers: Array<ServerRecord> = [];
    try {
        registeredServers = supabase ? await listRegisteredServersUsingServiceRole() : [];
    } catch (error) {
        console.error('Error loading server registry in middleware:', error);
    }
    const hasRegisteredServers = registeredServers.length > 0;
    const registeredServer = resolveRegisteredServerByHost(host, registeredServers);
    let customDomainResolution: CustomDomainResolution | null = null;
    let effectiveTablePrefix: string | null = null;

    if (registeredServer) {
        effectiveTablePrefix = registeredServer.tablePrefix;
    } else if (host && hasRegisteredServers && supabase) {
        try {
            customDomainResolution = await resolveCustomDomainAgent(host, supabase, registeredServers);
            if (customDomainResolution) {
                effectiveTablePrefix = customDomainResolution.server.tablePrefix;
            }
        } catch (error) {
            console.error('Error resolving custom domain host in middleware:', error);
        }
    } else if (!hasRegisteredServers && host) {
        effectiveTablePrefix = SUPABASE_TABLE_PREFIX;
    }

    const tablePrefixForRequest =
        hasRegisteredServers && effectiveTablePrefix !== null ? effectiveTablePrefix : SUPABASE_TABLE_PREFIX;
    const canQueryServerTables = Boolean(supabase && (!hasRegisteredServers || effectiveTablePrefix !== null));

    // [🧠] Use 30s-cached metadata to avoid per-request DB queries
    if (supabase && canQueryServerTables) {
        const cachedMeta = await loadCachedMiddlewareMetadata(supabase, tablePrefixForRequest);
        allowedIpsMetadata = cachedMeta.allowedIps;
        embeddingAllowedMetadata = cachedMeta.embeddingAllowed;
        serverVisibilityMetadata = cachedMeta.serverVisibility;
    }

    const allowedIps =
        allowedIpsMetadata !== null && allowedIpsMetadata !== undefined ? allowedIpsMetadata : allowedIpsEnv;
    const isEmbeddingAllowed = parseBooleanMetadataValue(embeddingAllowedMetadata, true);
    const serverVisibility = parseServerVisibility(
        process.env.SERVER_VISIBILITY || serverVisibilityMetadata,
        DEFAULT_SERVER_VISIBILITY,
    );
    const applyVisibilityHeadersForResponse = async (response: NextResponse): Promise<void> => {
        await applyVisibilityHeaders({
            request: req,
            response,
            supabase,
            tablePrefixForRequest,
            canQueryServerTables,
            serverVisibility,
        });
    };

    let isValidToken = false;
    const authHeader = req.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        if (token && token.startsWith('ptbk_') && supabase && canQueryServerTables) {
            try {
                const { data } = await supabase
                    .from(`${tablePrefixForRequest}ApiTokens`)
                    .select('id')
                    .eq('token', token)
                    .eq('isRevoked', false)
                    .single();

                if (data) {
                    isValidToken = true;
                }
            } catch (error) {
                console.error('Error validating token in middleware:', error);
            }
        }
    }

    const isIpAllowedResult = isIpAllowed(ip, allowedIps);
    const isLoggedIn = req.cookies.has('sessionToken');
    const isAccessRestricted = !isIpAllowedResult && !isLoggedIn && !isValidToken;

    // Handle OPTIONS (preflight) requests globally
    if (req.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
            },
        });
    }

    if (isAccessRestricted) {
        const path = req.nextUrl.pathname;

        // Allow specific paths for restricted users
        // - /: Homepage / Agent List
        // - /agents: Agent List
        // - /api/agents: Agent List API
        // - /api/federated-agents: Federated Agent List API
        // - /api/search: Global search API
        // - /api/auth/*: Auth endpoints
        // - /restricted: Restricted Access Page
        // - /docs: Documentation
        // - /openapi.json: Management API specification
        // - /swagger: Interactive management API explorer
        // - /manifest.webmanifest: Manifest
        // - /sw.js: Service Worker
        const isAllowedPath =
            path === '/' ||
            path === '/agents' ||
            path.startsWith('/api/agents') ||
            path.startsWith('/api/federated-agents') ||
            path.startsWith('/api/search') ||
            path.startsWith('/api/auth') ||
            path === '/restricted' ||
            path.startsWith('/docs') ||
            path === '/openapi.json' ||
            path === '/swagger' ||
            path === '/manifest.webmanifest' ||
            path === '/sw.js';

        if (isAllowedPath) {
            const response = NextResponse.next();
            await applyVisibilityHeadersForResponse(response);
            return response;
        }

        // Block access to other paths (e.g. Chat)
        if (req.headers.get('accept')?.includes('text/html')) {
            const url = req.nextUrl.clone();
            url.pathname = '/restricted';
            const response = NextResponse.rewrite(url);
            await applyVisibilityHeadersForResponse(response);
            return response;
        }
        const response = new NextResponse('Forbidden', { status: 403 });
        await applyVisibilityHeadersForResponse(response);
        return response;
    }

    // If we are here, the user is allowed (either by IP or session)
    // Proceed with normal logic

    // 3. Redirect /:agentName/* to /agents/:agentName/*
    //    This enables accessing agents from the root path
    const pathParts = req.nextUrl.pathname.split('/');
    const potentialAgentName = pathParts[1];

    if (
        potentialAgentName &&
        !RESERVED_PATHS.includes(potentialAgentName) &&
        !potentialAgentName.startsWith('.') &&
        // Note: Other static files are excluded by the matcher configuration below
        true
    ) {
        const url = req.nextUrl.clone();
        url.pathname = `/agents${req.nextUrl.pathname}`;
        const response = NextResponse.redirect(url);

        // Enable CORS for the redirect
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        await applyVisibilityHeadersForResponse(response);

        return response;
    }

    if (customDomainResolution) {
        const url = req.nextUrl.clone();
        url.pathname = `/${customDomainResolution.agentName}`;

        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-promptbook-server', customDomainResolution.server.domain);

        const response = NextResponse.rewrite(url, {
            request: {
                headers: requestHeaders,
            },
        });
        await applyVisibilityHeadersForResponse(response);
        return response;
    }

    const response = NextResponse.next();
    applyEmbeddingHeader(response, req.nextUrl, isEmbeddingAllowed);
    await applyVisibilityHeadersForResponse(response);

    return response;

    // This part should be unreachable due to logic above, but keeping as fallback
    return new NextResponse('Forbidden', { status: 403 });
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|logo-|fonts/).*)',
    ],
};

/**
 * Pattern that matches the standalone chat route used for embedding.
 */
const EMBED_CHAT_PATHNAME_PATTERN = /^\/agents\/[^/]+\/chat\/?$/;

/**
 * Pattern that matches canonical agent profile routes.
 */
const AGENT_PROFILE_PATHNAME_PATTERN = /^\/agents\/([^/]+)\/?$/;

/**
 * Pattern that matches any non-profile subpage under one agent.
 */
const AGENT_SUBPAGE_PATHNAME_PATTERN = /^\/agents\/[^/]+\/.+$/;

/**
 * Parameters required to apply visibility-aware robots headers.
 */
type ApplyVisibilityHeadersOptions = {
    request: NextRequest;
    response: NextResponse;
    supabase: TODO_any | null;
    tablePrefixForRequest: string;
    canQueryServerTables: boolean;
    serverVisibility: ServerVisibility;
};

/**
 * Classified agent-route shape used by robots header logic.
 */
type AgentRouteMatch = { kind: 'none' } | { kind: 'subpage' } | { kind: 'profile'; agentIdentifier: string };

/**
 * Applies visibility-aware `X-Robots-Tag` headers to HTML responses.
 *
 * @param options - Response and visibility context.
 */
async function applyVisibilityHeaders(options: ApplyVisibilityHeadersOptions): Promise<void> {
    if (!isHtmlRequest(options.request)) {
        return;
    }

    if (!isPublicServerVisibility(options.serverVisibility)) {
        options.response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return;
    }

    const routeMatch = resolveAgentRouteMatch(options.request.nextUrl.pathname);
    if (routeMatch.kind === 'none') {
        return;
    }

    if (routeMatch.kind === 'subpage') {
        options.response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return;
    }

    const agentVisibility = await resolveAgentVisibilityForIndexing({
        supabase: options.supabase,
        tablePrefixForRequest: options.tablePrefixForRequest,
        canQueryServerTables: options.canQueryServerTables,
        agentIdentifier: routeMatch.agentIdentifier,
    });

    options.response.headers.set(
        'X-Robots-Tag',
        isPublicAgentVisibility(agentVisibility) ? 'index, follow' : 'noindex, nofollow',
    );
}

/**
 * Checks whether the request is likely targeting an HTML page response.
 *
 * @param request - Incoming middleware request.
 * @returns `true` when response robots headers should be evaluated.
 */
function isHtmlRequest(request: NextRequest): boolean {
    return request.headers.get('accept')?.includes('text/html') === true;
}

/**
 * Classifies one pathname into agent profile/subpage buckets for indexing policy.
 *
 * @param pathname - Request pathname.
 * @returns Agent route classification.
 */
function resolveAgentRouteMatch(pathname: string): AgentRouteMatch {
    const profileMatch = pathname.match(AGENT_PROFILE_PATHNAME_PATTERN);
    if (profileMatch && profileMatch[1]) {
        return {
            kind: 'profile',
            agentIdentifier: profileMatch[1],
        };
    }

    if (AGENT_SUBPAGE_PATHNAME_PATTERN.test(pathname)) {
        return { kind: 'subpage' };
    }

    return { kind: 'none' };
}

/**
 * Loads one agent visibility value for profile indexing decisions.
 *
 * @param options - Agent lookup options.
 * @returns Agent visibility, or `null` when unavailable.
 */
async function resolveAgentVisibilityForIndexing(options: {
    supabase: TODO_any | null;
    tablePrefixForRequest: string;
    canQueryServerTables: boolean;
    agentIdentifier: string;
}): Promise<AgentVisibility | null> {
    if (!options.supabase || !options.canQueryServerTables) {
        return null;
    }

    const decodedAgentIdentifier = decodeURIComponentSafe(options.agentIdentifier);

    try {
        const { data, error } = await options.supabase
            .from(`${options.tablePrefixForRequest}Agent`)
            .select('visibility')
            .or(buildAgentNameOrIdFilter(decodedAgentIdentifier))
            .is('deletedAt', null)
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        const visibility = (data as { visibility?: unknown }).visibility;
        return isAgentVisibility(visibility) ? visibility : null;
    } catch (error) {
        console.error('Failed to resolve agent visibility for robots header:', error);
        return null;
    }
}

/**
 * Decodes one URL-encoded path segment without throwing.
 *
 * @param value - Encoded path segment.
 * @returns Decoded value or original text when decoding fails.
 */
function decodeURIComponentSafe(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * Parses boolean metadata values, falling back when the stored value is missing or unrecognized.
 *
 * @param raw - Raw metadata text.
 * @param fallback - Value used when the metadata does not contain a usable boolean.
 * @returns Parsed boolean setting.
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

/**
 * Checks whether request targets the headless chat route used for iframe embedding.
 *
 * @param url - Parsed request URL.
 * @returns `true` when framing headers should be applied.
 */
function isEmbedChatRequest(url: URL): boolean {
    return EMBED_CHAT_PATHNAME_PATTERN.test(url.pathname) && url.searchParams.has('headless');
}

/**
 * Applies framing headers for the headless chat embedding route based on whether embedding is allowed.
 *
 * @param response - Response object that will be sent to the browser.
 * @param url - Parsed request URL used to check whether the embedding route was requested.
 * @param isAllowed - When true, framing is permitted; otherwise it is denied.
 */
function applyEmbeddingHeader(response: NextResponse, url: URL, isAllowed: boolean): void {
    if (!isEmbedChatRequest(url)) {
        return;
    }

    if (isAllowed) {
        response.headers.set('Content-Security-Policy', 'frame-ancestors https: http:');
        response.headers.delete('X-Frame-Options');
        return;
    }

    response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    response.headers.set('X-Frame-Options', 'DENY');
}
