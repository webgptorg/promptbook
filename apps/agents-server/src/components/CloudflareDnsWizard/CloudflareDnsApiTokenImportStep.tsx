'use client';

import { useState } from 'react';
import type { CloudflareDnsBatchRecordStatus } from '../../utils/cloudflare/CloudflareDnsBatchApplication';
import type { DnsRecordGroup } from '../../utils/dnsRecords/DnsRecordInstruction';
import type { DnsRecordBatchPlan } from '../../utils/dnsRecords/resolveDnsRecordBatchPlan';
import { CloudflareDnsExcludedRecordsNote } from './CloudflareDnsExcludedRecordsNote';
import { useCloudflareDnsRecordImport } from './useCloudflareDnsRecordImport';

/**
 * Cloudflare page where an administrator creates the API token for the import.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
const CLOUDFLARE_API_TOKENS_URL = 'https://dash.cloudflare.com/profile/api-tokens';

/**
 * Colors of the per-record import results.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
const CLOUDFLARE_DNS_IMPORT_STATUS_CLASS_NAMES: Record<CloudflareDnsBatchRecordStatus, string> = {
    created: 'text-emerald-700',
    updated: 'text-emerald-700',
    unchanged: 'text-slate-600',
    skipped: 'text-amber-700',
    failed: 'text-red-700',
};

/**
 * Writes every record of the DNS manual into Cloudflare with one API token.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export function CloudflareDnsApiTokenImportStep({
    batchPlan,
    domain,
    recordGroups,
}: {
    /**
     * Records which can be imported at once together with the excluded ones.
     */
    readonly batchPlan: DnsRecordBatchPlan;

    /**
     * Hostname whose DNS records are being configured.
     */
    readonly domain: string;

    /**
     * All record groups displayed by the DNS manual.
     */
    readonly recordGroups: ReadonlyArray<DnsRecordGroup>;
}) {
    const [apiToken, setApiToken] = useState('');
    const { isImporting, application, errorMessage, importRecords } = useCloudflareDnsRecordImport({
        domain,
        recordGroups,
    });
    const recordCount = batchPlan.applicableRecords.length;

    return (
        <div className="space-y-3">
            <p className="font-medium">Import all records with one click</p>
            <p className="text-amber-900">
                Paste a Cloudflare API token created from the <strong>Edit zone DNS</strong> template. The token is used
                once to write all {recordCount} record{recordCount === 1 ? '' : 's'} into the Cloudflare zone of{' '}
                <span className="font-mono">{domain}</span> and is never stored.
            </p>
            <a
                href={CLOUDFLARE_API_TOKENS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2 hover:text-amber-900"
            >
                Create a Cloudflare API token
            </a>

            <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    void importRecords(apiToken);
                }}
            >
                <label className="flex-1 space-y-1">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Cloudflare API token
                    </span>
                    <input
                        type="password"
                        value={apiToken}
                        autoComplete="off"
                        placeholder="Leave empty to use the token configured on this VPS"
                        onChange={(event) => setApiToken(event.target.value)}
                        className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-slate-800"
                    />
                </label>
                <button
                    type="submit"
                    disabled={isImporting}
                    className="rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-60"
                >
                    {isImporting ? 'Importing…' : `Import ${recordCount} record${recordCount === 1 ? '' : 's'}`}
                </button>
            </form>

            {errorMessage ? (
                <p className="whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    {errorMessage}
                </p>
            ) : null}

            {application ? (
                <div className="space-y-1 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs">
                    <p className="font-semibold text-amber-900">Imported into the zone {application.zoneName}</p>
                    <ul className="space-y-1">
                        {application.results.map((result) => (
                            <li key={`${result.type}-${result.name}-${result.value}`}>
                                <span className="font-mono text-slate-800">
                                    {result.type} {result.name}
                                </span>{' '}
                                <span className={CLOUDFLARE_DNS_IMPORT_STATUS_CLASS_NAMES[result.status]}>
                                    {result.status}
                                </span>{' '}
                                &mdash; <span className="text-slate-600">{result.message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <CloudflareDnsExcludedRecordsNote excludedRecords={batchPlan.excludedRecords} />
        </div>
    );
}
