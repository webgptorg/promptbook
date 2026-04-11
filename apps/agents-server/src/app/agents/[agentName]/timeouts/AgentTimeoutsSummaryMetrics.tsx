import type { useAgentTimeoutsClientState } from './useAgentTimeoutsClientState';

/**
 * Props for the timeout summary metric grid.
 *
 * @private function of AgentTimeoutsClient
 */
type AgentTimeoutsSummaryMetricsProps = {
    state: ReturnType<typeof useAgentTimeoutsClientState>;
};

/**
 * One metric shown in the timeout-manager summary grid.
 *
 * @private function of AgentTimeoutsSummaryMetrics
 */
type TimeoutSummaryMetric = {
    label: string;
    value: string;
};

/**
 * Builds the summary metrics shown above the timeout table.
 *
 * @private function of AgentTimeoutsSummaryMetrics
 */
function createTimeoutSummaryMetrics(
    counters: ReturnType<typeof useAgentTimeoutsClientState>['counters'],
): Array<TimeoutSummaryMetric> {
    return [
        { label: 'All', value: String(counters?.allCount ?? 0) },
        {
            label: 'Active',
            value: String((counters?.queuedCount ?? 0) + (counters?.runningCount ?? 0) - (counters?.pausedCount ?? 0)),
        },
        { label: 'Paused', value: String(counters?.pausedCount ?? 0) },
        { label: 'Failed', value: String(counters?.failedCount ?? 0) },
    ];
}

/**
 * Renders the timeout summary metrics.
 *
 * @private function of AgentTimeoutsClient
 */
export function AgentTimeoutsSummaryMetrics({ state }: AgentTimeoutsSummaryMetricsProps) {
    const metrics = createTimeoutSummaryMetrics(state.counters);

    return (
        <div className="grid gap-3 md:grid-cols-4">
            {metrics.map((metric) => (
                <TimeoutMetricCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
        </div>
    );
}

/**
 * Compact metric card used by the timeout manager header.
 *
 * @private function of AgentTimeoutsSummaryMetrics
 */
function TimeoutMetricCard({ label, value }: TimeoutSummaryMetric) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
            <div className="mt-1 text-2xl font-light text-gray-900">{value}</div>
        </div>
    );
}
