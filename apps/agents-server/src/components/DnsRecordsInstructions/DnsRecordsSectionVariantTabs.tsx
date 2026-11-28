'use client';

import type { DnsRecordsSectionVariant } from '../../utils/dnsRecords/DnsRecordsSection';

/**
 * Renders the accessible variant switch of one DNS record section.
 *
 * @private internal part of <DnsRecordsInstructions/>
 */
export function DnsRecordsSectionVariantTabs({
    label,
    onSelect,
    selectedVariantId,
    variants,
}: {
    /**
     * Label of the whole variant group.
     */
    readonly label: string;

    /**
     * Called with the identifier of the newly selected variant.
     */
    readonly onSelect: (variantId: string) => void;

    /**
     * Identifier of the currently selected variant.
     */
    readonly selectedVariantId: string;

    /**
     * Alternative setups of the section.
     */
    readonly variants: ReadonlyArray<DnsRecordsSectionVariant>;
}) {
    return (
        <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">{label}</p>
            <div
                className="flex flex-wrap gap-1 rounded-md border border-amber-200 bg-white p-1"
                role="tablist"
                aria-label={label}
            >
                {variants.map((variant) => {
                    const isSelected = variant.id === selectedVariantId;

                    return (
                        <button
                            key={variant.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => onSelect(variant.id)}
                            className={`flex-1 rounded px-2 py-2 text-xs font-semibold transition ${
                                isSelected
                                    ? 'bg-amber-700 text-white shadow-sm'
                                    : 'text-amber-800 hover:bg-amber-50 hover:text-amber-950'
                            }`}
                        >
                            {variant.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
