import type { DnsRecordInstruction, DnsRecordSelection } from './DnsRecordInstruction';

/**
 * Placeholder values like `<VPS_PUBLIC_IP>` have to be filled in by a human before the record can be created.
 */
const DNS_RECORD_PLACEHOLDER_VALUE_PATTERN = /<[^>]+>/;

/**
 * One DNS record which cannot be configured in one batch together with the other records.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export type ExcludedDnsRecordInstruction = {
    /**
     * DNS record which has to be configured manually.
     */
    readonly record: DnsRecordInstruction;

    /**
     * Explanation why the record is not part of the batch.
     */
    readonly reason: string;
};

/**
 * Split of the DNS records shown in one manual into records which can be configured in one batch and the rest.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export type DnsRecordBatchPlan = {
    /**
     * DNS records which can be exported or written to the DNS provider without any human decision.
     */
    readonly applicableRecords: ReadonlyArray<DnsRecordInstruction>;

    /**
     * DNS records which are intentionally left out of the batch.
     */
    readonly excludedRecords: ReadonlyArray<ExcludedDnsRecordInstruction>;
};

/**
 * Resolves which of the shown DNS records can be configured in one batch.
 *
 * This is the single source of truth for both the zone-file export and the Cloudflare API import, so that both ways
 * of the wizard configure exactly the same records.
 *
 * @param options - Records shown in the DNS manual and whether they are alternatives.
 * @returns Records which can be batched together with the reasons for the excluded ones.
 */
export function resolveDnsRecordBatchPlan(options: {
    readonly records: ReadonlyArray<DnsRecordInstruction>;
    readonly recordSelection: DnsRecordSelection;
}): DnsRecordBatchPlan {
    const applicableRecords: Array<DnsRecordInstruction> = [];
    const excludedRecords: Array<ExcludedDnsRecordInstruction> = [];

    for (const record of options.records) {
        if (DNS_RECORD_PLACEHOLDER_VALUE_PATTERN.test(record.value)) {
            excludedRecords.push({
                record,
                reason: `The value \`${record.value}\` is a placeholder which has to be filled in manually.`,
            });
            continue;
        }

        // Note: When the records are alternatives, only the first (recommended) one may be configured, because the
        //       other ones would conflict with it on the same hostname.
        if (options.recordSelection === 'one' && applicableRecords.length > 0) {
            excludedRecords.push({
                record,
                reason: 'Alternative of the recommended record, configure it only instead of the recommended record.',
            });
            continue;
        }

        applicableRecords.push(record);
    }

    return { applicableRecords, excludedRecords };
}
