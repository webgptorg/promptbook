/**
 * Props for one admin summary metric card.
 *
 * @private shared admin UI type
 */
type AdminMetricCardProps = {
    /**
     * Small heading naming the measured thing.
     */
    readonly label: string;

    /**
     * Measured value, already formatted.
     */
    readonly value: string;

    /**
     * Short sentence saying what the value means.
     */
    readonly caption: string;
};

/**
 * Small metric card used in the summary header of admin dashboards.
 *
 * @private shared admin UI component
 */
export function AdminMetricCard({ caption, label, value }: AdminMetricCardProps) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
            <div className="mt-2 text-3xl font-light text-gray-900">{value}</div>
            <div className="mt-1 text-sm text-gray-500">{caption}</div>
        </div>
    );
}
