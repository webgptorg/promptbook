import type { useTaskManagerState } from './useTaskManagerState';

/**
 * Props for the task-manager summary metrics grid.
 *
 * @private function of TaskManagerClient
 */
type TaskManagerSummaryMetricsProps = Pick<ReturnType<typeof useTaskManagerState>, 'counters' | 'oldestQueuedAgeLabel'>;

/**
 * Props for one summary metric card.
 *
 * @private function of TaskManagerSummaryMetrics
 */
type MetricCardProps = {
    caption: string;
    label: string;
    value: string;
};

/**
 * Small metric card used in the task-manager summary header.
 *
 * @private function of TaskManagerSummaryMetrics
 */
function MetricCard({ caption, label, value }: MetricCardProps) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
            <div className="mt-2 text-3xl font-light text-gray-900">{value}</div>
            <div className="mt-1 text-sm text-gray-500">{caption}</div>
        </div>
    );
}

/**
 * Renders the summary counters above the task table.
 *
 * @private function of TaskManagerClient
 */
export function TaskManagerSummaryMetrics({ counters, oldestQueuedAgeLabel }: TaskManagerSummaryMetricsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
                label="Running"
                value={counters ? counters.runningCount.toLocaleString() : '...'}
                caption="Workers in flight"
            />
            <MetricCard
                label="Queued"
                value={counters ? counters.queuedCount.toLocaleString() : '...'}
                caption="Tasks waiting to start"
            />
            <MetricCard
                label="Failed 24h"
                value={counters ? counters.failedLast24hCount.toLocaleString() : '...'}
                caption="Recent failures"
            />
            <MetricCard label="Oldest queued" value={oldestQueuedAgeLabel} caption="Backlog age" />
        </div>
    );
}
