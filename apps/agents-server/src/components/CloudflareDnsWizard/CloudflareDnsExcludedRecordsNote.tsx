import type { ExcludedDnsRecordInstruction } from '../../utils/dnsRecords/resolveDnsRecordBatchPlan';

/**
 * Lists the records which are intentionally left out of a batch import.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export function CloudflareDnsExcludedRecordsNote({
    excludedRecords,
}: {
    /**
     * Records which have to be configured manually.
     */
    readonly excludedRecords: ReadonlyArray<ExcludedDnsRecordInstruction>;
}) {
    if (excludedRecords.length === 0) {
        return null;
    }

    return (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-semibold">Not part of this import</p>
            <ul className="list-disc space-y-1 pl-5">
                {excludedRecords.map((excludedRecord) => (
                    <li
                        key={`${excludedRecord.record.type}-${excludedRecord.record.name}-${excludedRecord.record.value}`}
                    >
                        <span className="font-mono">
                            {excludedRecord.record.type} {excludedRecord.record.name}
                        </span>{' '}
                        &mdash; {excludedRecord.reason}
                    </li>
                ))}
            </ul>
        </div>
    );
}
