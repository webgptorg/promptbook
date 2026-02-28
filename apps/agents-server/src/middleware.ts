import { TODO_any } from '@promptbook-local/types';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { SERVERS, SUPABASE_TABLE_PREFIX } from '../config';
import { RESERVED_PATHS } from './generated/reservedPaths';
import { resolveCustomDomainAgent, type CustomDomainResolution } from './utils/customDomainRouting';
import { buildServerTablePrefix } from './utils/serverTablePrefix';
import { isIpAllowed } from './utils/isIpAllowed';

export async function middleware(req: NextRequest) {
    // 1. Get client IP
    let ip = (req as TODO_any).ip;
    const xForwardedFor = req.headers.get('x-forwarded-for');
    if (!ip && xForwardedFor) {
        ip = xForwardedFor.split(',')[0].trim();
    }
    // Fallback for local development if needed, though req.ip is usually ::1 or 127.0.0.1
    ip = ip || '127.0.0.1';

    // 2. Determine allowed IPs
    // Priority: Metadata > Environment Variable

    const allowedIpsEnv = process.env.RESTRICT_IP;
    let allowedIpsMetadata: string | null = null;
    let embeddingAllowedMetadata: string | null = null;

    const host = req.headers.get('host');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase =
        supabaseUrl && supabaseKey
            ? createClient(supabaseUrl, supabaseKey, {
                  auth: {
                      persistSession: false,
                      autoRefreshToken: false,
                  },
              })
            : null;

    const hasConfiguredServers = Boolean(SERVERS && SERVERS.length > 0);
    const hostIsRegisteredServer =
        hasConfiguredServers && host ? SERVERS.some((server) => server === host) : false;
    let customDomainResolution: CustomDomainResolution | null = null;
    let effectiveServerHost: string | null = null;

    if (hostIsRegisteredServer && host) {
        effectiveServerHost = host;
    } else if (host && hasConfiguredServers && supabase) {
        try {
            customDomainResolution = await resolveCustomDomainAgent(host, supabase, SERVERS);
            if (customDomainResolution) {
                effectiveServerHost = customDomainResolution.serverHost;
            }
        } catch (error) {
            console.error('Error resolving custom domain host in middleware:', error);
        }
    } else if (!hasConfiguredServers && host) {
        effectiveServerHost = host;
    }

    const tablePrefixForRequest =
        hasConfiguredServers && effectiveServerHost
            ? buildServerTablePrefix(effectiveServerHost)
            : SUPABASE_TABLE_PREFIX;
    const canQueryServerTables = Boolean(supabase && (!hasConfiguredServers || effectiveServerHost));

    if (supabase && canQueryServerTables) {
        try {
            const { data } = await supabase
                .from(`${tablePrefixForRequest}Metadata`)
                .select('key, value')
                .in('key', ['RESTRICT_IP', 'IS_EMBEDDING_ALLOWED']);

            if (Array.isArray(data)) {
                for (const row of data) {
                    const key = row?.key;
                    const value = row?.value;
                    if (key === 'RESTRICT_IP' && typeof value === 'string' && value !== '') {
                        allowedIpsMetadata = value;
                    }
                    if (key === 'IS_EMBEDDING_ALLOWED' && typeof value === 'string') {
                        embeddingAllowedMetadata = value;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching metadata in middleware:', error);
        }
    }

    const allowedIps =
        allowedIpsMetadata !== null && allowedIpsMetadata !== undefined ? allowedIpsMetadata : allowedIpsEnv;
    const isEmbeddingAllowed = parseBooleanMetadataValue(embeddingAllowedMetadata, true);

    let isValidToken = false;
    const authHeader = req.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        if (token.startsWith('ptbk_') && supabase && canQueryServerTables) {
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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
            path === '/manifest.webmanifest' ||
            path === '/sw.js';

        if (isAllowedPath) {
            return NextResponse.next();
        }

        // Block access to other paths (e.g. Chat)
        if (req.headers.get('accept')?.includes('text/html')) {
            const url = req.nextUrl.clone();
            url.pathname = '/restricted';
            return NextResponse.rewrite(url);
        }
        return new NextResponse('Forbidden', { status: 403 });
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

        return response;
    }

    if (customDomainResolution) {
        const url = req.nextUrl.clone();
        url.pathname = `/${customDomainResolution.agentName}`;

        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-promptbook-server', customDomainResolution.serverHost);

        return NextResponse.rewrite(url, {
            request: {
                headers: requestHeaders,
            },
        });
    }

    const response = NextResponse.next();
    applyEmbeddingHeader(response, req.nextUrl, isEmbeddingAllowed);

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
