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
    let ip = req.ip;
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

    const allowedIps = allowedIpsMetadata !== null && allowedIpsMetadata !== undefined ? allowedIpsMetadata : allowedIpsEnv;

    if (isIpAllowed(ip, allowedIps)) {
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
