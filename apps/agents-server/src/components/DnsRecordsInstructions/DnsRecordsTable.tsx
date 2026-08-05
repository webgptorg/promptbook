import type { DnsRecordInstruction } from '../../utils/dnsRecords/DnsRecordInstruction';

/**
 * Renders the canonical table of DNS records which an administrator copies to their DNS provider.
 *
 * @private internal part of <DnsRecordsInstructions/>
 */
export function DnsRecordsTable({
    records,
}: {
    /**
     * DNS records of one section variant.
     */
    readonly records: ReadonlyArray<DnsRecordInstruction>;
}) {
    return (
        <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
            <table className="min-w-full divide-y divide-amber-100 text-xs">
                <thead className="bg-amber-100/60 text-amber-900">
                    <tr>
                        <th className="px-3 py-2 text-left font-semibold">Type</th>
                        <th className="px-3 py-2 text-left font-semibold">Name</th>
                        <th className="px-3 py-2 text-left font-semibold">Value</th>
                        <th className="px-3 py-2 text-left font-semibold">When to use</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                    {records.map((record) => (
                        <tr key={`${record.type}-${record.name}-${record.value}`}>
                            <td className="px-3 py-2 font-mono font-semibold text-amber-900">{record.type}</td>
                            <td className="px-3 py-2 font-mono text-slate-800">{record.name}</td>
                            <td className="px-3 py-2 font-mono text-slate-800">{record.value}</td>
                            <td className="px-3 py-2 text-amber-900">{record.note || 'Required.'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
