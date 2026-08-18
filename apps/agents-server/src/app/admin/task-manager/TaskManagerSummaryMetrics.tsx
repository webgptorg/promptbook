import { AdminMetricCard } from '../_components/AdminMetricCard';
import type { useTaskManagerState } from './useTaskManagerState';

/**
 * Props for the task-manager summary metrics grid.
 *
 * @private function of TaskManagerClient
 */
type TaskManagerSummaryMetricsProps = Pick<ReturnType<typeof useTaskManagerState>, 'counters' | 'oldestQueuedAgeLabel'>;

/**
 * Renders the summary counters above the task table.
 *
 * @private function of TaskManagerClient
 */
export function TaskManagerSummaryMetrics({ counters, oldestQueuedAgeLabel }: TaskManagerSummaryMetricsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard
                label="Running"
                value={counters ? counters.runningCount.toLocaleString() : '...'}
                caption="Workers in flight"
            />
            <AdminMetricCard
                label="Queued"
                value={counters ? counters.queuedCount.toLocaleString() : '...'}
                caption="Tasks waiting to start"
            />
            <AdminMetricCard
                label="Failed 24h"
                value={counters ? counters.failedLast24hCount.toLocaleString() : '...'}
                caption="Recent failures"
            />
            <AdminMetricCard label="Oldest queued" value={oldestQueuedAgeLabel} caption="Backlog age" />
        </div>
    );
}
