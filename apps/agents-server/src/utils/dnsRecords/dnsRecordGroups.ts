import type { DnsRecordGroup } from './DnsRecordInstruction';

/**
 * Determines whether every record of every shown group has to be configured.
 *
 * @param recordGroups - Groups shown in one DNS manual.
 * @returns `true` when no group offers alternatives.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function isEveryDnsRecordGroupRequired(recordGroups: ReadonlyArray<DnsRecordGroup>): boolean {
    return recordGroups.every((recordGroup) => recordGroup.recordSelection === 'all');
}

/**
 * Determines whether every shown group offers alternatives out of which only one may be configured.
 *
 * @param recordGroups - Groups shown in one DNS manual.
 * @returns `true` when no group requires all of its records.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function isEveryDnsRecordGroupAlternative(recordGroups: ReadonlyArray<DnsRecordGroup>): boolean {
    return recordGroups.every((recordGroup) => recordGroup.recordSelection === 'one');
}

/**
 * Determines whether at least one shown group offers alternatives.
 *
 * Such a group can conflict with already configured records on the same hostname, so the manual has to mention
 * removing them.
 *
 * @param recordGroups - Groups shown in one DNS manual.
 * @returns `true` when at least one group offers alternatives.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function hasAlternativeDnsRecordGroup(recordGroups: ReadonlyArray<DnsRecordGroup>): boolean {
    return recordGroups.some((recordGroup) => recordGroup.recordSelection === 'one');
}

/**
 * Counts all records shown in the given groups.
 *
 * @param recordGroups - Groups shown in one DNS manual.
 * @returns Number of shown records.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function countDnsRecordGroupRecords(recordGroups: ReadonlyArray<DnsRecordGroup>): number {
    return recordGroups.reduce((recordCount, recordGroup) => recordCount + recordGroup.records.length, 0);
}
