'use client';

import { useState } from 'react';
import { createDnsZoneFileExport } from '../../utils/dnsRecords/createDnsZoneFileExport';
import type { DnsRecordBatchPlan } from '../../utils/dnsRecords/resolveDnsRecordBatchPlan';
import { CloudflareDnsExcludedRecordsNote } from './CloudflareDnsExcludedRecordsNote';

/**
 * Cloudflare help page for importing a zone file.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
const CLOUDFLARE_ZONE_FILE_IMPORT_GUIDE_URL =
    'https://developers.cloudflare.com/dns/manage-dns-records/how-to/import-and-export/';

/**
 * Exports all records of the DNS manual as one zone file which Cloudflare imports at once.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export function CloudflareDnsZoneFileImportStep({
    batchPlan,
    domain,
}: {
    /**
     * Records which can be exported at once together with the excluded ones.
     */
    readonly batchPlan: DnsRecordBatchPlan;

    /**
     * Hostname whose DNS records are being configured.
     */
    readonly domain: string;
}) {
    const [isCopied, setIsCopied] = useState(false);
    const zoneFile = createDnsZoneFileExport({ domain, records: batchPlan.applicableRecords });

    /**
     * Copies the generated zone file into the clipboard.
     */
    const handleCopyZoneFile = async () => {
        try {
            await navigator.clipboard.writeText(zoneFile);
            setIsCopied(true);
        } catch (error) {
            console.error('Failed to copy the zone file:', error);
        }
    };

    /**
     * Downloads the generated zone file so that it can be uploaded to Cloudflare.
     */
    const handleDownloadZoneFile = () => {
        const zoneFileUrl = URL.createObjectURL(new Blob([zoneFile], { type: 'text/plain' }));
        const downloadLink = document.createElement('a');

        downloadLink.href = zoneFileUrl;
        downloadLink.download = `${domain}-dns-records.txt`;
        downloadLink.click();
        URL.revokeObjectURL(zoneFileUrl);
    };

    return (
        <div className="space-y-3">
            <p className="font-medium">Import all records as a zone file</p>
            <ol className="list-decimal space-y-1 pl-5 text-amber-900">
                <li>Download or copy the zone file below.</li>
                <li>
                    In Cloudflare open DNS, then Records, then <span className="font-semibold">Import and Export</span>.
                </li>
                <li>
                    Select <span className="font-semibold">Import DNS records</span> and upload the file.
                </li>
                <li>Keep proxying turned off so that this page can verify the hostname.</li>
            </ol>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => void handleCopyZoneFile()}
                    className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-800"
                >
                    {isCopied ? 'Copied' : 'Copy zone file'}
                </button>
                <button
                    type="button"
                    onClick={handleDownloadZoneFile}
                    className="rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                >
                    Download zone file
                </button>
                <a
                    href={CLOUDFLARE_ZONE_FILE_IMPORT_GUIDE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2 hover:text-amber-900"
                >
                    Cloudflare import guide
                </a>
            </div>

            <pre className="overflow-auto rounded-md border border-amber-200 bg-white p-3 font-mono text-xs text-slate-800">
                {zoneFile}
            </pre>

            <CloudflareDnsExcludedRecordsNote excludedRecords={batchPlan.excludedRecords} />
        </div>
    );
}
