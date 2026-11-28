'use client';

import type { ServerLanguageCode } from '@/src/languages/ServerLanguageRegistry';
import type { PlannedMessageManagerCounters } from '@/src/utils/plannedMessageManager/createPlannedMessageManagerCounters';
import { AdminMetricCard } from '../_components/AdminMetricCard';
import { formatPlannedMessageDateTime } from './plannedMessageManagerPresentation';

/**
 * Props for the planned-message summary metrics grid.
 *
 * @private function of PlannedMessageManagerClient
 */
type PlannedMessageManagerSummaryMetricsProps = {
    readonly counters: PlannedMessageManagerCounters;
    readonly isLoading: boolean;
    readonly language: ServerLanguageCode;
};

/**
 * Renders the summary counters above the planned-message table.
 *
 * @private function of PlannedMessageManagerClient
 */
export function PlannedMessageManagerSummaryMetrics({
    counters,
    isLoading,
    language,
}: PlannedMessageManagerSummaryMetricsProps) {
    /**
     * Formats one counter, keeping the loading placeholder until the first listing arrives.
     */
    function formatCounter(count: number): string {
        return isLoading ? '...' : count.toLocaleString();
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard
                label="Ongoing"
                value={formatCounter(counters.countByLifecycle.ONGOING)}
                caption="Waking their agent right now"
            />
            <AdminMetricCard
                label="Scheduled"
                value={formatCounter(counters.countByLifecycle.SCHEDULED + counters.countByLifecycle.NOT_STARTED)}
                caption="Wake-ups still ahead"
            />
            <AdminMetricCard
                label="Paused"
                value={formatCounter(counters.countByLifecycle.PAUSED)}
                caption="Held back until resumed"
            />
            <AdminMetricCard
                label="Next wake-up"
                value={isLoading ? '...' : formatPlannedMessageDateTime(counters.nextDueAt, language)}
                caption="Earliest planned wake-up"
            />
        </div>
    );
}
