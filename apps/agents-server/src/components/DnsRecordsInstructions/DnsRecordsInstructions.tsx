'use client';

import { useState, type ReactNode } from 'react';
import type { DnsProviderGuide } from '../../utils/dnsProviderGuides';
import type { DnsRecordGroup } from '../../utils/dnsRecords/DnsRecordInstruction';
import type { DnsRecordsSection, DnsRecordsSectionVariant } from '../../utils/dnsRecords/DnsRecordsSection';
import {
    hasAlternativeDnsRecordGroup,
    isEveryDnsRecordGroupAlternative,
    isEveryDnsRecordGroupRequired,
} from '../../utils/dnsRecords/dnsRecordGroups';
import { CloudflareDnsWizard } from '../CloudflareDnsWizard/CloudflareDnsWizard';
import { DnsProviderGuides } from '../DnsProviderGuides/DnsProviderGuides';
import { DnsRecordsSectionPanel } from './DnsRecordsSectionPanel';

/**
 * The one DNS record configuration panel of the Agents Server administration.
 *
 * Every administration view uses this same component and just passes the sections which are relevant for it - the
 * Super Admin servers page passes all sections of one server, while a subpage such as `/admin/email-server` passes
 * only its own section. All shown sections are configured by one shared Cloudflare wizard.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function DnsRecordsInstructions({
    description,
    domain,
    providerGuides,
    sections,
    title,
}: {
    /**
     * Context-specific explanation of the DNS state or setup requirement.
     */
    readonly description?: ReactNode;

    /**
     * Domain whose DNS zone holds all shown records.
     */
    readonly domain: string;

    /**
     * Optional provider-specific documentation links.
     */
    readonly providerGuides?: ReadonlyArray<DnsProviderGuide>;

    /**
     * Parts of the DNS setup shown in this manual.
     */
    readonly sections: ReadonlyArray<DnsRecordsSection>;

    /**
     * Context-specific panel title.
     */
    readonly title?: ReactNode;
}) {
    const [selectedVariantIdBySectionId, setSelectedVariantIdBySectionId] = useState<Record<string, string>>({});
    const selectedVariantBySection = sections.map((section) => ({
        section,
        selectedVariant: resolveSelectedDnsRecordsSectionVariant(
            section,
            selectedVariantIdBySectionId[section.id] || null,
        ),
    }));
    const recordGroups: ReadonlyArray<DnsRecordGroup> = selectedVariantBySection.flatMap(({ selectedVariant }) =>
        selectedVariant ? [selectedVariant] : [],
    );
    const isRecordShown = recordGroups.some((recordGroup) => recordGroup.records.length > 0);

    return (
        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            {title || description ? (
                <div className="space-y-1">
                    {title ? <p className="font-semibold">{title}</p> : null}
                    {description ? <div>{description}</div> : null}
                </div>
            ) : null}

            {selectedVariantBySection.map(({ section, selectedVariant }) =>
                selectedVariant ? (
                    <DnsRecordsSectionPanel
                        key={section.id}
                        onSelectVariant={(variantId) =>
                            setSelectedVariantIdBySectionId((selectedVariantIds) => ({
                                ...selectedVariantIds,
                                [section.id]: variantId,
                            }))
                        }
                        section={section}
                        selectedVariant={selectedVariant}
                    />
                ) : null,
            )}

            <div className="space-y-2">
                <p className="font-medium">How to set it up</p>
                <ol className="list-decimal space-y-1 pl-5 text-amber-900">
                    <li>Open your DNS provider for this domain.</li>
                    <li>
                        {resolveDnsRecordSelectionInstruction(recordGroups)} for{' '}
                        <span className="font-mono">{domain}</span>.
                    </li>
                    {hasAlternativeDnsRecordGroup(recordGroups) ? (
                        <li>Remove conflicting A, AAAA, or CNAME records for the same hostname.</li>
                    ) : null}
                    <li>Wait for DNS propagation, then refresh this page.</li>
                </ol>
            </div>

            {isRecordShown ? <CloudflareDnsWizard domain={domain} recordGroups={recordGroups} /> : null}

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

/**
 * Resolves which variant of one section is currently shown.
 *
 * The first variant is the recommended one, so it stays selected until the administrator picks another one.
 *
 * @param section - Section whose variant is resolved.
 * @param selectedVariantId - Variant picked by the administrator, when there is one.
 * @returns Selected variant, or `null` for a section without any variant.
 *
 * @private function of <DnsRecordsInstructions/>
 */
function resolveSelectedDnsRecordsSectionVariant(
    section: DnsRecordsSection,
    selectedVariantId: string | null,
): DnsRecordsSectionVariant | null {
    return section.variants.find((variant) => variant.id === selectedVariantId) || section.variants[0] || null;
}

/**
 * Resolves how many of the shown records an administrator has to configure.
 *
 * @param recordGroups - Currently selected groups of all shown sections.
 * @returns Instruction sentence without the domain.
 *
 * @private function of <DnsRecordsInstructions/>
 */
function resolveDnsRecordSelectionInstruction(recordGroups: ReadonlyArray<DnsRecordGroup>): string {
    if (isEveryDnsRecordGroupRequired(recordGroups)) {
        return 'Add all records shown above';
    }

    if (isEveryDnsRecordGroupAlternative(recordGroups)) {
        return 'Add one of the records above';
    }

    return 'Add all records shown above, and only one record from each group of alternatives';
}
