import { NEXT_PUBLIC_URL, SERVERS, SUPABASE_TABLE_PREFIX } from '@/config';
import { normalizeTo_PascalCase } from '@promptbook-local/utils';
import { headers } from 'next/headers';

export async function $provideServer() {
    if (!SERVERS) {
        return {
            publicUrl: NEXT_PUBLIC_URL || new URL(`https://${(await headers()).get('host') || 'localhost:4440'}`),
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
        } else {
            throw new Error(`Server with host "${host}" is not configured in SERVERS`);
        }
    }

    let serverName = host;

    serverName = serverName.replace(/\.ptbk\.io$/, '');
    serverName = normalizeTo_PascalCase(serverName);

    return {
        publicUrl: new URL(`https://${host}`),
        tablePrefix: `server_${serverName}_`,
    };
}
