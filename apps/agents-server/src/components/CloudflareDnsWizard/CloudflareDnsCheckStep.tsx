import type { DnsRecordSelection } from '../../utils/dnsRecords/DnsRecordInstruction';

/**
 * Explains how to verify the configured records after they were written to Cloudflare.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export function CloudflareDnsCheckStep({
    recordSelection,
}: {
    /**
     * Whether all listed records or one listed alternative must be configured.
     */
    readonly recordSelection: DnsRecordSelection;
}) {
    return (
        <div className="space-y-2">
            <p className="font-medium">Check the result</p>
            <ol className="list-decimal space-y-1 pl-5 text-amber-900">
                {recordSelection === 'one' ? (
                    <li>Remove conflicting A, AAAA, or CNAME records for the same hostname.</li>
                ) : null}
                <li>Wait for DNS propagation.</li>
                <li>Refresh this page to check the DNS status again.</li>
            </ol>
        </div>
    );
}
