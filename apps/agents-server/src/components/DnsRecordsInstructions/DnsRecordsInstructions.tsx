import type { ReactNode } from 'react';
import type { DnsProviderGuide } from '../../utils/dnsProviderGuides';
import type { DnsRecordInstruction, DnsRecordSelection } from '../../utils/dnsRecords/DnsRecordInstruction';
import { CloudflareDnsWizard } from '../CloudflareDnsWizard/CloudflareDnsWizard';
import { DnsProviderGuides } from '../DnsProviderGuides/DnsProviderGuides';

/**
 * Standardized DNS record configuration panel shared by Agents Server administration views.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function DnsRecordsInstructions({
    description,
    domain,
    recordSelection,
    records,
    providerGuides,
    resolvedAddresses,
    title,
}: {
    /**
     * Context-specific explanation of the DNS state or setup requirement.
     */
    readonly description?: ReactNode;

    /**
     * Domain whose records are being configured.
     */
    readonly domain: string;

    /**
     * Whether every shown record or just one alternative must be configured.
     */
    readonly recordSelection: DnsRecordSelection;

    /**
     * DNS records to configure at the provider.
     */
    readonly records: ReadonlyArray<DnsRecordInstruction>;

    /**
     * Optional provider-specific documentation links.
     */
    readonly providerGuides?: ReadonlyArray<DnsProviderGuide>;

    /**
     * Addresses currently returned by public DNS, when verification is available.
     */
    readonly resolvedAddresses?: ReadonlyArray<string>;

    /**
     * Context-specific panel title.
     */
    readonly title?: ReactNode;
}) {
    const recordSelectionInstruction =
        recordSelection === 'one' ? 'Add one of the records above' : 'Add all records shown above';

    return (
        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            {title || description || resolvedAddresses?.length ? (
                <div className="space-y-1">
                    {title ? <p className="font-semibold">{title}</p> : null}
                    {description ? <div>{description}</div> : null}
                    {resolvedAddresses?.length ? (
                        <p className="text-xs text-amber-800">
                            Currently resolves to: <span className="font-mono">{resolvedAddresses.join(', ')}</span>
                        </p>
                    ) : null}
                </div>
            ) : null}

            {records.length ? (
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
            ) : null}

            <div className="space-y-2">
                <p className="font-medium">How to fix it</p>
                <ol className="list-decimal space-y-1 pl-5 text-amber-900">
                    <li>Open your DNS provider for this domain.</li>
                    <li>
                        {recordSelectionInstruction} for <span className="font-mono">{domain}</span>.
                    </li>
                    {recordSelection === 'one' ? (
                        <li>Remove conflicting A, AAAA, or CNAME records for the same hostname.</li>
                    ) : null}
                    <li>Wait for DNS propagation, then refresh this page.</li>
                </ol>
            </div>

            {records.length ? (
                <CloudflareDnsWizard domain={domain} recordSelection={recordSelection} records={records} />
            ) : null}

            <div className="space-y-2">
                <p className="font-medium">Provider guides</p>
                <DnsProviderGuides
                    guides={providerGuides}
                    linkClassName="font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2 hover:text-amber-900"
                />
            </div>
        </div>
    );
}
