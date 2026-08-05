import type { DnsRecordGroup } from '../../utils/dnsRecords/DnsRecordInstruction';
import { hasAlternativeDnsRecordGroup } from '../../utils/dnsRecords/dnsRecordGroups';

/**
 * Explains how to verify the configured records after they were written to Cloudflare.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export function CloudflareDnsCheckStep({
    recordGroups,
}: {
    /**
     * All record groups displayed by the DNS manual.
     */
    readonly recordGroups: ReadonlyArray<DnsRecordGroup>;
}) {
    return (
        <div className="space-y-2">
            <p className="font-medium">Check the result</p>
            <ol className="list-decimal space-y-1 pl-5 text-amber-900">
                {hasAlternativeDnsRecordGroup(recordGroups) ? (
                    <li>Remove conflicting A, AAAA, or CNAME records for the same hostname.</li>
                ) : null}
                <li>Wait for DNS propagation.</li>
                <li>Refresh this page to check the DNS status again.</li>
            </ol>
        </div>
    );
}
