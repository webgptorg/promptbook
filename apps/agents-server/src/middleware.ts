import { TODO_any } from '@promptbook-local/types';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { SERVERS, SUPABASE_TABLE_PREFIX } from '../config';
import { isIpAllowed } from './utils/isIpAllowed';

// Note: Re-implementing normalizeTo_PascalCase to avoid importing from @promptbook-local/utils which might have Node.js dependencies
function normalizeTo_PascalCase(text: string): string {
    return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return word.toUpperCase();
        })
        .replace(/\s+/g, '');
}

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

    // To fetch metadata, we need to know the table name, which depends on the host
    const host = req.headers.get('host');

    if (host) {
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
                    .from(`${tablePrefix}Metadata`)
                    .select('value')
                    .eq('key', 'RESTRICT_IP')
                    .single();

                if (data && data.value) {
                    allowedIpsMetadata = data.value;
                }
            } catch (error) {
                console.error('Error fetching metadata in middleware:', error);
            }
        }
    }

    const allowedIps =
        allowedIpsMetadata !== null && allowedIpsMetadata !== undefined ? allowedIpsMetadata : allowedIpsEnv;

    if (isIpAllowed(ip, allowedIps)) {
        // Handle OPTIONS (preflight) requests before any redirects
        // to avoid CORS issues ("Redirect is not allowed for a preflight request")
        if (req.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // 3. Redirect /:agentName/* to /agents/:agentName/*
        //    This enables accessing agents from the root path
        const pathParts = req.nextUrl.pathname.split('/');
        const potentialAgentName = pathParts[1];

        if (
            potentialAgentName &&
            !['agents', 'api', 'admin', 'test', 'embed', '_next', 'favicon.ico'].includes(potentialAgentName) &&
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
        //    If the host is not one of the configured SERVERS, try to find an agent with a matching META LINK

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

                // TODO: [🧠] If there are many servers, this loop might be slow. Optimize if needed.
                for (const serverHost of serversToCheck) {
                    let serverName = serverHost;
                    serverName = serverName.replace(/\.ptbk\.io$/, '');
                    serverName = normalizeTo_PascalCase(serverName);
                    const prefix = `server_${serverName}_`;

                    // Search for agent with matching META LINK
                    // agentProfile->links is an array of strings
                    // We check if it contains the host, or https://host, or http://host

                    const searchLinks = [host, `https://${host}`, `http://${host}`];

                    // Construct OR filter: agentProfile.cs.{"links":["link1"]},agentProfile.cs.{"links":["link2"]},...
                    const orFilter = searchLinks.map((link) => `agentProfile.cs.{"links":["${link}"]}`).join(',');

                    try {
                        const { data } = await supabase
                            .from(`${prefix}Agent`)
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

        return NextResponse.next();
    }

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
