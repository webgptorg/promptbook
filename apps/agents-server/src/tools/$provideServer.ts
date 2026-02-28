import { NEXT_PUBLIC_SITE_URL, SERVERS, SUPABASE_TABLE_PREFIX } from '@/config';
import { headers } from 'next/headers';
import { buildServerTablePrefix } from '../utils/serverTablePrefix';

export async function $provideServer() {
    if (!SERVERS) {
        return {
            publicUrl: NEXT_PUBLIC_SITE_URL || new URL(`https://${(await headers()).get('host') || 'localhost:4440'}`),
            tablePrefix: SUPABASE_TABLE_PREFIX,
        };
    }

    const headersList = await headers();
    let host = headersList.get('host');
    const xPromptbookServer = headersList.get('x-promptbook-server');

    if (host === null) {
        throw new Error('Host header is missing');
    }

    // If host is not in known servers, check if we have a context header from middleware
    if (!SERVERS.some((server) => server === host)) {
        if (xPromptbookServer && SERVERS.some((server) => server === xPromptbookServer)) {
            host = xPromptbookServer;
        } else if (host.startsWith('127.0.0.1') || host.startsWith('localhost')) {
            // Allow localhost for development/prerendering
            return {
                publicUrl: NEXT_PUBLIC_SITE_URL || new URL(`https://${host}`),
                tablePrefix: SUPABASE_TABLE_PREFIX,
            };
        } else {
            throw new Error(`Server with host "${host}" is not configured in SERVERS`);
        }
    }

    return {
        publicUrl: new URL(`https://${host}`),
        tablePrefix: buildServerTablePrefix(host),
    };
}
