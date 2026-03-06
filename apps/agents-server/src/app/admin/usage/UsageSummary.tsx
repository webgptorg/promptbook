'use client';

import { Card } from '@/src/components/Homepage/Card';
import { useMemo } from 'react';
import type { UsageAnalyticsResponse, UsageMetricMode } from '@/src/utils/usageAdmin';
import {
    formatCompactNumber,
    formatUsageMetricValue,
    resolveSummaryMetricValue,
    usageMetricLabel,
} from './usageFormatters';

/**
 * Props for the usage summary grid.
 */
type UsageSummaryProps = {
    summary: UsageAnalyticsResponse['summary'];
    metric: UsageMetricMode;
};

/**
 * Summary cards that surface key usage totals for the selected filters.
 */
export function UsageSummary(props: UsageSummaryProps) {
    const { summary, metric } = props;

    const summaryItems = useMemo(() => {
        const primaryMetricLabel = usageMetricLabel(metric);
        const primaryMetricValue = formatUsageMetricValue(metric, resolveSummaryMetricValue(summary, metric));

        return [
            { label: 'Total calls', value: formatCompactNumber(summary.totalCalls) },
            { label: 'Total tokens', value: formatCompactNumber(summary.totalTokens) },
            { label: `Total ${primaryMetricLabel.toLowerCase()}`, value: primaryMetricValue },
            { label: 'Agents involved', value: formatCompactNumber(summary.uniqueAgents) },
            { label: 'Users involved', value: formatCompactNumber(summary.uniqueUsers) },
            { label: 'API keys used', value: formatCompactNumber(summary.uniqueApiKeys) },
            { label: 'User agents', value: formatCompactNumber(summary.uniqueUserAgents) },
        ];
    }, [summary, metric]);

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryItems.map((item) => (
                <Card key={item.label} className="bg-gradient-to-br from-slate-50 to-white">
                    <div className="text-xs uppercase tracking-wide text-gray-500">{item.label}</div>
                    <div className="mt-2 text-3xl font-light text-gray-900">{item.value}</div>
                </Card>
            ))}
        </div>
    );
}
