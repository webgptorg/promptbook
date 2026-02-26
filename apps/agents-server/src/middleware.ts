import { TODO_any } from '@promptbook-local/types';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { SERVERS } from '../config';
import { $getTableName } from './database/$getTableName';
import { RESERVED_PATHS } from './generated/reservedPaths';
import { createCustomDomainOrFilter } from './utils/customDomainRouting';
import { isIpAllowed } from './utils/isIpAllowed';
import { parseBooleanMetadataFlag } from './utils/metadataFlags';

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
    let isEmbeddingAllowedMetadata: string | null = null;

    // To fetch metadata, we need to know the table name, which depends on the host
    const host = req.headers.get('host');

    if (host) {
        /*
        Note: [🐔] This code was commented out because results of it are unused

        let tablePrefix = SUPABASE_TABLE_PREFIX;

        
        if (SERVERS && SERVERS.length > 0) {
            // Logic mirrored from src/tools/$provideServer.ts
            if (SERVERS.some((server) => server === host)) {
                let serverName = host;
                serverName = serverName.replace(/\.ptbk\.io$/, '');
                serverName = normalizeTo_PascalCase(serverName);
                tablePrefix = `server_${serverName}_`;
            }
        }
        */

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                    },
                });

                const { data } = await supabase
                    .from(await $getTableName(`Metadata`))
                    .select('key, value')
                    .in('key', ['RESTRICT_IP', 'IS_EMBEDDING_ALLOWED']);

                for (const row of data ?? []) {
                    if (row.key === 'RESTRICT_IP') {
                        allowedIpsMetadata = row.value;
                    } else if (row.key === 'IS_EMBEDDING_ALLOWED') {
                        isEmbeddingAllowedMetadata = row.value;
                    }
                }
            } catch (error) {
                console.error('Error fetching metadata in middleware:', error);
            }
        }
    }

    const allowedIps =
        allowedIpsMetadata !== null && allowedIpsMetadata !== undefined ? allowedIpsMetadata : allowedIpsEnv;

    let isValidToken = false;
    const authHeader = req.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        if (token.startsWith('ptbk_')) {
            /*
            Note: [🐔] This code was commented out because results of it are unused
            
            const host = req.headers.get('host');
            let tablePrefix = SUPABASE_TABLE_PREFIX;

            if (host && SERVERS && SERVERS.length > 0) {
                if (SERVERS.some((server) => server === host)) {
                    let serverName = host;
                    serverName = serverName.replace(/\.ptbk\.io$/, '');
                    serverName = normalizeTo_PascalCase(serverName);
                    tablePrefix = `server_${serverName}_`;
                }
            }
            */

            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseKey) {
                try {
                    const supabase = createClient(supabaseUrl, supabaseKey, {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                        },
                    });

                    const { data } = await supabase
                        .from(await $getTableName(`ApiTokens`))
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

    // 4. Custom Domain Routing
    //    If the host is not one of the configured SERVERS, try to find an agent with matching META DOMAIN
    //    (or legacy META LINK fallback).

    if (host && SERVERS && !SERVERS.some((server) => server === host)) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            });

            // Determine prefixes to check
            // We check all configured servers because the custom domain could point to any of them
            // (or if they share the database, we need to check the relevant tables)
            const serversToCheck = SERVERS;
            const orFilter = createCustomDomainOrFilter(host);

            if (!orFilter) {
                return NextResponse.next();
            }

            // TODO: [🧠] If there are many servers, this loop might be slow. Optimize if needed.
            for (const serverHost of serversToCheck) {
                try {
                    const { data } = await supabase
                        .from(await $getTableName(`Agent`))
                        .select('agentName')
                        .or(orFilter)
                        .limit(1)
                        .single();

                    if (data && data.agentName) {
                        // Found the agent!
                        const url = req.nextUrl.clone();
                        url.pathname = `/${data.agentName}`;

                        // Pass the server context to the app via header
                        const requestHeaders = new Headers(req.headers);
                        requestHeaders.set('x-promptbook-server', serverHost);

                        return NextResponse.rewrite(url, {
                            request: {
                                headers: requestHeaders,
                            },
                        });
                    }
                } catch (error) {
                    // Ignore error (e.g. table not found, or agent not found) and continue to next server
                    // console.error(`Error checking server ${serverHost} for custom domain ${host}:`, error);
                }
            }
        }
    }

    const isEmbedPath =
        req.nextUrl.pathname === '/embed' || req.nextUrl.pathname === '/embed/';

    const response = NextResponse.next();

    if (isEmbedPath) {
        const isEmbeddingAllowed = parseBooleanMetadataFlag(isEmbeddingAllowedMetadata, true);
        if (isEmbeddingAllowed) {
            response.headers.delete('X-Frame-Options');
            response.headers.set('Content-Security-Policy', 'frame-ancestors *');
        } else {
            response.headers.set('X-Frame-Options', 'DENY');
            response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
        }
    }

    return response;
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
