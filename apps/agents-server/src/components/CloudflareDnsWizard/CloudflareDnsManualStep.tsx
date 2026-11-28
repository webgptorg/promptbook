import { isProxyableCloudflareDnsRecordType } from '../../utils/cloudflare/CloudflareApi';
import type { DnsRecordGroup } from '../../utils/dnsRecords/DnsRecordInstruction';
import { countDnsRecordGroupRecords, isEveryDnsRecordGroupAlternative } from '../../utils/dnsRecords/dnsRecordGroups';

/**
 * Direct Cloudflare dashboard URL for the DNS records page.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
const CLOUDFLARE_DNS_RECORDS_URL = 'https://dash.cloudflare.com/?to=/:account/:zone/dns/records';

/**
 * Explains how to add the records of the DNS manual by hand in the Cloudflare dashboard.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export function CloudflareDnsManualStep({
    domain,
    recordGroups,
}: {
    /**
     * Hostname whose DNS records are being configured.
     */
    readonly domain: string;

    /**
     * All record groups displayed by the DNS manual.
     */
    readonly recordGroups: ReadonlyArray<DnsRecordGroup>;
}) {
    const records = recordGroups.flatMap((recordGroup) => recordGroup.records);
    const isProxyStatusRelevant = records.some((record) => isProxyableCloudflareDnsRecordType(record.type));
    const recordCount = countDnsRecordGroupRecords(recordGroups);
    const recordSelectionInstruction = isEveryDnsRecordGroupAlternative(recordGroups)
        ? 'Choose one of the record alternatives shown above.'
        : `Repeat this for all ${recordCount} record${recordCount === 1 ? '' : 's'} shown above.`;

    return (
        <div className="space-y-2">
            <p className="font-medium">Add the records one by one</p>
            <ol className="list-decimal space-y-1 pl-5 text-amber-900">
                <li>Sign in to Cloudflare.</li>
                <li>
                    Select the Cloudflare zone that contains <span className="font-mono">{domain}</span>, then open DNS,
                    then Records.
                </li>
                <li>Select Add record.</li>
                <li>{recordSelectionInstruction}</li>
                <li>
                    Copy its Type, Name, and Value from the table above. Cloudflare calls the Value field Content or
                    Target, depending on the record type.
                </li>
                {isProxyStatusRelevant ? (
                    <li>
                        For A, AAAA, and CNAME records, set Proxy status to DNS only (the gray cloud). This lets this
                        page verify that the hostname resolves directly to the VPS.
                    </li>
                ) : null}
                <li>Select Save.</li>
            </ol>
            <a
                href={CLOUDFLARE_DNS_RECORDS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2 hover:text-amber-900"
            >
                Open Cloudflare DNS records
            </a>
        </div>
    );
}
