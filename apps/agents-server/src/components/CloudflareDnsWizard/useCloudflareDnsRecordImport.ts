'use client';

import { useCallback, useState } from 'react';
import type { CloudflareDnsBatchApplication } from '../../utils/cloudflare/CloudflareDnsBatchApplication';
import type { DnsRecordGroup } from '../../utils/dnsRecords/DnsRecordInstruction';

/**
 * Endpoint which writes the records of one DNS manual into Cloudflare.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
const CLOUDFLARE_DNS_IMPORT_ENDPOINT = '/api/admin/dns-records/cloudflare';

/**
 * Imports all records of one DNS manual into Cloudflare with one API token.
 *
 * The token is only passed through to the server for this one import and is never persisted by the browser.
 *
 * @param options - Domain and records of the DNS manual.
 * @returns Import state and the import handler.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export function useCloudflareDnsRecordImport(options: {
    readonly domain: string;
    readonly recordGroups: ReadonlyArray<DnsRecordGroup>;
}): {
    readonly isImporting: boolean;
    readonly application: CloudflareDnsBatchApplication | null;
    readonly errorMessage: string | null;
    readonly importRecords: (apiToken: string) => Promise<void>;
} {
    const [isImporting, setIsImporting] = useState(false);
    const [application, setApplication] = useState<CloudflareDnsBatchApplication | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { domain, recordGroups } = options;

    const importRecords = useCallback(
        async (apiToken: string) => {
            setIsImporting(true);
            setErrorMessage(null);
            setApplication(null);

            try {
                const response = await fetch(CLOUDFLARE_DNS_IMPORT_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiToken, domain, recordGroups }),
                });
                const payload = (await response.json().catch(() => null)) as
                    | (CloudflareDnsBatchApplication & { readonly error?: string })
                    | null;

                if (!response.ok || !payload || payload.error) {
                    setErrorMessage(payload?.error || 'Failed to import the DNS records into Cloudflare.');
                    return;
                }

                setApplication(payload);
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to reach Cloudflare.');
            } finally {
                setIsImporting(false);
            }
        },
        [domain, recordGroups],
    );

    return { isImporting, application, errorMessage, importRecords };
}
