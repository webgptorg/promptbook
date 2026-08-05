'use client';

import type { DnsRecordsSection, DnsRecordsSectionVariant } from '../../utils/dnsRecords/DnsRecordsSection';
import { DnsRecordsSectionVariantTabs } from './DnsRecordsSectionVariantTabs';
import { DnsRecordsTable } from './DnsRecordsTable';

/**
 * Renders one part of the DNS setup - its explanation, its optional setup variants, and its records.
 *
 * @private internal part of <DnsRecordsInstructions/>
 */
export function DnsRecordsSectionPanel({
    onSelectVariant,
    section,
    selectedVariant,
}: {
    /**
     * Called with the identifier of the newly selected variant of this section.
     */
    readonly onSelectVariant: (variantId: string) => void;

    /**
     * Section to render.
     */
    readonly section: DnsRecordsSection;

    /**
     * Variant of the section which is currently selected.
     */
    readonly selectedVariant: DnsRecordsSectionVariant;
}) {
    return (
        <section aria-label={section.title} className="space-y-3 rounded-lg border border-amber-200 bg-white/70 p-4">
            <div className="space-y-1">
                <h3 className="font-semibold">{section.title}</h3>
                {section.description ? <div className="text-amber-900">{section.description}</div> : null}
                {section.statusSummary ? (
                    <p className={section.isDnsIssue ? 'text-amber-800' : 'text-emerald-700'}>
                        {section.statusSummary}
                    </p>
                ) : null}
                {section.resolvedAddresses?.length ? (
                    <p className="text-xs text-amber-800">
                        Currently resolves to: <span className="font-mono">{section.resolvedAddresses.join(', ')}</span>
                    </p>
                ) : null}
            </div>

            {section.variants.length > 1 ? (
                <DnsRecordsSectionVariantTabs
                    label={section.variantsLabel || 'Setup'}
                    onSelect={onSelectVariant}
                    selectedVariantId={selectedVariant.id}
                    variants={section.variants}
                />
            ) : null}

            {selectedVariant.description ? <div className="text-amber-900">{selectedVariant.description}</div> : null}

            {selectedVariant.records.length ? <DnsRecordsTable records={selectedVariant.records} /> : null}
        </section>
    );
}
