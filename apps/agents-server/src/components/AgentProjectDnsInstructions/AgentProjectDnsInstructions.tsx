'use client';

import { useId, useState } from 'react';
import { DnsProviderGuides } from '../DnsProviderGuides/DnsProviderGuides';
import { createAgentProjectDnsRecord } from '../../utils/agentProjects/createAgentProjectDnsRecords';

/**
 * Displays DNS setup instructions for generated agent project domains.
 *
 * The two tab groups intentionally represent independent choices: one domain
 * coverage and one record type. Exactly one record from the selected
 * combination should be configured at the DNS provider.
 */
export function AgentProjectDnsInstructions({
    isDnsIssue = false,
    projectDomain,
    publicIpAddress,
    serverDomain,
}: {
    /**
     * Whether at least one generated project domain currently fails DNS verification.
     */
    readonly isDnsIssue?: boolean;

    /**
     * Example generated project domain used by the single-project variant, when one already exists.
     */
    readonly projectDomain?: string | null;

    /**
     * Public VPS IP address, when known by the server.
     */
    readonly publicIpAddress: string | null | undefined;

    /**
     * Base server domain used by generated project domains.
     */
    readonly serverDomain: string;
}) {
    const [isWildcardDomain, setIsWildcardDomain] = useState(true);
    const [isCnameRecord, setIsCnameRecord] = useState(true);
    const instructionId = useId();
    const selectedRecord = createAgentProjectDnsRecord({
        isCnameRecord,
        isWildcardDomain,
        projectDomain,
        publicIpAddress,
        serverDomain,
    });
    const selectedDomainDescription = isWildcardDomain
        ? `This covers all generated project domains under ${serverDomain}.`
        : projectDomain
        ? `This covers one project, for example ${projectDomain}. Repeat it for each project that needs a public URL.`
        : 'This covers one generated project. Replace the project name placeholder above with its full hostname.';

    return (
        <section className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-4 text-sm text-indigo-950">
            <div className="space-y-1">
                <h4 className="font-semibold">Project DNS setup</h4>
                <p>
                    Project URLs use a subdomain of <code>{serverDomain}</code>. Configure exactly one of the following
                    setups; do not add both the single-project and wildcard records, or both A and CNAME records for the
                    same hostname.
                </p>
            </div>

            {isDnsIssue ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    One or more generated project domains do not resolve to this VPS yet. The recommended wildcard CNAME
                    setup is selected below.
                </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
                <DnsInstructionTabGroup
                    label="Domain coverage"
                    tabs={[
                        { label: 'Single project', value: false },
                        { label: 'Wildcard (all projects, recommended)', value: true },
                    ]}
                    selectedValue={isWildcardDomain}
                    onSelect={setIsWildcardDomain}
                    idPrefix={`${instructionId}-domain`}
                />
                <DnsInstructionTabGroup
                    label="Record type"
                    tabs={[
                        { label: 'A record (VPS IP)', value: false },
                        { label: 'CNAME record (server domain, recommended)', value: true },
                    ]}
                    selectedValue={isCnameRecord}
                    onSelect={setIsCnameRecord}
                    idPrefix={`${instructionId}-record`}
                />
            </div>

            <p className="text-indigo-900">{selectedDomainDescription}</p>

            <div className="overflow-x-auto rounded-lg border border-indigo-200 bg-white">
                <table className="min-w-full divide-y divide-indigo-100 text-xs">
                    <thead className="bg-indigo-100/60 text-indigo-900">
                        <tr>
                            <th className="px-3 py-2 text-left font-semibold">Type</th>
                            <th className="px-3 py-2 text-left font-semibold">Name</th>
                            <th className="px-3 py-2 text-left font-semibold">Value</th>
                            <th className="px-3 py-2 text-left font-semibold">When to use</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="px-3 py-2 font-mono font-semibold text-indigo-950">{selectedRecord.type}</td>
                            <td className="px-3 py-2 font-mono text-slate-800">{selectedRecord.name}</td>
                            <td className="px-3 py-2 font-mono text-slate-800">{selectedRecord.value}</td>
                            <td className="px-3 py-2 text-indigo-900">{selectedRecord.note}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="space-y-2">
                <p className="font-medium">How to set it up</p>
                <ol className="list-decimal space-y-1 pl-5 text-indigo-900">
                    <li>Open the DNS settings for the domain.</li>
                    <li>Add the single record shown above.</li>
                    <li>Remove conflicting A, AAAA, or CNAME records for the same hostname.</li>
                    <li>Wait for DNS propagation, then open the project URL again.</li>
                </ol>
            </div>

            <div className="space-y-2">
                <p className="font-medium">Provider guides</p>
                <DnsProviderGuides linkClassName="font-semibold text-indigo-700 underline decoration-indigo-400 underline-offset-2 hover:text-indigo-900" />
            </div>
        </section>
    );
}

/**
 * Renders one accessible two-option tab group used by the DNS instruction panel.
 */
function DnsInstructionTabGroup<TValue extends boolean>({
    idPrefix,
    label,
    onSelect,
    selectedValue,
    tabs,
}: {
    readonly idPrefix: string;
    readonly label: string;
    readonly onSelect: (value: TValue) => void;
    readonly selectedValue: TValue;
    readonly tabs: ReadonlyArray<{ readonly label: string; readonly value: TValue }>;
}) {
    return (
        <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">{label}</p>
            <div className="flex rounded-md border border-indigo-200 bg-white p-1" role="tablist" aria-label={label}>
                {tabs.map((tab) => {
                    const isSelected = tab.value === selectedValue;

                    return (
                        <button
                            key={tab.label}
                            id={`${idPrefix}-${tab.value ? 'alternative' : 'primary'}`}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => onSelect(tab.value)}
                            className={`flex-1 rounded px-2 py-2 text-xs font-semibold transition ${
                                isSelected
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-indigo-700 hover:bg-indigo-50 hover:text-indigo-950'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
