import { Card } from '@/src/components/Homepage/Card';
import type { UsageAnalyticsResponse, UsageMetricMode } from '@/src/utils/usageAdmin';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { UsageClientFormatting } from './UsageClientFormatting';
import { UsageClientTimelineChart } from './UsageClientTimelineChart';

/**
 * Props for `<UsageClientAnalyticsPanels/>`.
 */
type UsageClientAnalyticsPanelsProps = {
    data: UsageAnalyticsResponse;
    metric: UsageMetricMode;
};

/**
 * Analytics cards, charts, and tables rendered by `<UsageClient/>`.
 * @private function of UsageClient
 */
export function UsageClientAnalyticsPanels(props: UsageClientAnalyticsPanelsProps) {
    const { data, metric } = props;

    const summaryItems = useMemo(() => {
        const primaryMetricLabel = UsageClientFormatting.usageMetricLabel(metric);
        const primaryMetricValue = UsageClientFormatting.formatUsageMetricValue(
            metric,
            UsageClientFormatting.resolveSummaryMetricValue(data.summary, metric),
        );

        return [
            { label: 'Total calls', value: UsageClientFormatting.formatCompactNumber(data.summary.totalCalls) },
            { label: 'Total tokens', value: UsageClientFormatting.formatCompactNumber(data.summary.totalTokens) },
            { label: `Total ${primaryMetricLabel.toLowerCase()}`, value: primaryMetricValue },
            { label: 'Agents involved', value: UsageClientFormatting.formatCompactNumber(data.summary.uniqueAgents) },
            { label: 'Users involved', value: UsageClientFormatting.formatCompactNumber(data.summary.uniqueUsers) },
            { label: 'API keys used', value: UsageClientFormatting.formatCompactNumber(data.summary.uniqueApiKeys) },
            {
                label: 'User agents',
                value: UsageClientFormatting.formatCompactNumber(data.summary.uniqueUserAgents),
            },
        ];
    }, [data, metric]);

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryItems.map((item) => (
                    <Card key={item.label} className="bg-gradient-to-br from-slate-50 to-white">
                        <div className="text-xs uppercase tracking-wide text-gray-500">{item.label}</div>
                        <div className="mt-2 text-3xl font-light text-gray-900">{item.value}</div>
                    </Card>
                ))}
            </div>

            <Card className="overflow-hidden">
                <div className="mb-3">
                    <h2 className="text-xl font-medium text-gray-900">
                        {UsageClientFormatting.usageMetricLabel(metric)} over time
                    </h2>
                    <p className="text-sm text-gray-500">
                        {UsageClientFormatting.usageMetricDescription(metric)} in the selected timeframe.
                    </p>
                </div>
                <UsageClientTimelineChart points={data.timeline} metric={metric} />
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <h2 className="text-lg font-medium text-gray-900">By call type</h2>
                    <div className="mt-4 space-y-3">
                        {data.breakdownByCallType.map((item) => (
                            <UsageClientBreakdownRow
                                key={item.key}
                                label={item.label}
                                value={UsageClientFormatting.resolveMetricValue(item, metric)}
                                total={UsageClientFormatting.resolveSummaryMetricValue(data.summary, metric)}
                                metric={metric}
                                colorClass={UsageClientFormatting.callTypeColorClass(item.key)}
                            />
                        ))}
                    </div>
                </Card>
                <Card>
                    <h2 className="text-lg font-medium text-gray-900">By actor type</h2>
                    <div className="mt-4 space-y-3">
                        {data.breakdownByActorType.map((item) => (
                            <UsageClientBreakdownRow
                                key={item.key}
                                label={item.label}
                                value={UsageClientFormatting.resolveMetricValue(item, metric)}
                                total={UsageClientFormatting.resolveSummaryMetricValue(data.summary, metric)}
                                metric={metric}
                                colorClass={UsageClientFormatting.actorTypeColorClass(item.key)}
                            />
                        ))}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card>
                    <h2 className="text-lg font-medium text-gray-900">Per agent</h2>
                    <UsageClientSimpleCountTable
                        emptyLabel="No agent usage for current filters."
                        metric={metric}
                        rows={data.perAgent.map((item) => ({
                            label: item.agentName,
                            calls: item.calls,
                            tokens: item.tokens,
                            priceUsd: item.priceUsd,
                            duration: item.duration,
                            humanDuration: item.humanDuration,
                        }))}
                    />
                </Card>

                <Card>
                    <h2 className="text-lg font-medium text-gray-900">Per user</h2>
                    <UsageClientSimpleCountTable
                        emptyLabel="No user usage for current filters."
                        metric={metric}
                        rows={data.perUser.map((item) => ({
                            label: UsageClientFormatting.formatUsageUserLabel(item.username),
                            calls: item.calls,
                            tokens: item.tokens,
                            priceUsd: item.priceUsd,
                            duration: item.duration,
                            humanDuration: item.humanDuration,
                        }))}
                    />
                </Card>

                <Card>
                    <h2 className="text-lg font-medium text-gray-900">Per folder</h2>
                    <UsageClientSimpleCountTable
                        emptyLabel="No folder usage for current filters."
                        metric={metric}
                        rows={data.perFolder.map((item) => ({
                            label: item.folderName,
                            calls: item.calls,
                            tokens: item.tokens,
                            priceUsd: item.priceUsd,
                            duration: item.duration,
                            humanDuration: item.humanDuration,
                        }))}
                    />
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                    <h2 className="text-lg font-medium text-gray-900">API key details</h2>
                    <UsageClientDetailsTable
                        emptyLabel="No API key usage for current filters."
                        headers={['API key', 'Calls', 'Tokens', UsageClientFormatting.usageMetricLabel(metric), 'Last seen']}
                        rows={data.apiKeys.map((item) => [
                            `${UsageClientFormatting.truncateMiddle(item.apiKey, 12, 8)}${
                                item.note ? ` (${item.note})` : ''
                            }`,
                            UsageClientFormatting.formatCompactNumber(item.calls),
                            UsageClientFormatting.formatCompactNumber(item.tokens),
                            UsageClientFormatting.formatUsageMetricValue(
                                metric,
                                UsageClientFormatting.resolveMetricValue(item, metric),
                            ),
                            UsageClientFormatting.formatDateTime(item.lastSeen),
                        ])}
                    />
                </Card>

                <Card>
                    <h2 className="text-lg font-medium text-gray-900">User agent details</h2>
                    <UsageClientDetailsTable
                        emptyLabel="No user-agent usage for current filters."
                        headers={['User agent', 'Calls', 'Tokens', UsageClientFormatting.usageMetricLabel(metric), 'Last seen']}
                        rows={data.userAgents.map((item) => [
                            item.userAgent || 'Unknown',
                            UsageClientFormatting.formatCompactNumber(item.calls),
                            UsageClientFormatting.formatCompactNumber(item.tokens),
                            UsageClientFormatting.formatUsageMetricValue(
                                metric,
                                UsageClientFormatting.resolveMetricValue(item, metric),
                            ),
                            UsageClientFormatting.formatDateTime(item.lastSeen),
                        ])}
                    />
                </Card>
            </div>
        </>
    );
}

/**
 * Props for `<UsageClientBreakdownRow/>`.
 */
type UsageClientBreakdownRowProps = {
    label: string;
    value: number;
    total: number;
    metric: UsageMetricMode;
    colorClass: string;
};

/**
 * One horizontal row in a usage breakdown chart.
 */
function UsageClientBreakdownRow(props: UsageClientBreakdownRowProps) {
    const { label, value, total, metric, colorClass } = props;
    const percentage = total <= 0 ? 0 : (value / total) * 100;

    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700">{label}</span>
                <span className="font-medium text-gray-900">
                    {UsageClientFormatting.formatUsageMetricValue(metric, value)} ({percentage.toFixed(1)}%)
                </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min(100, percentage)}%` }} />
            </div>
        </div>
    );
}

/**
 * One row in the simple count table.
 */
type UsageClientSimpleCountTableRow = {
    label: string;
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
    humanDuration: number;
};

/**
 * Props for `<UsageClientSimpleCountTable/>`.
 */
type UsageClientSimpleCountTableProps = {
    rows: UsageClientSimpleCountTableRow[];
    metric: UsageMetricMode;
    emptyLabel: string;
};

/**
 * Small count table used by agent/user/folder sections.
 */
function UsageClientSimpleCountTable(props: UsageClientSimpleCountTableProps) {
    const { rows, metric, emptyLabel } = props;

    if (rows.length === 0) {
        return <p className="mt-4 text-sm text-gray-500">{emptyLabel}</p>;
    }

    return (
        <div className="mt-4 max-h-80 overflow-auto rounded-md border border-gray-100">
            <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2 text-right">Calls</th>
                        <th className="px-3 py-2 text-right">Tokens</th>
                        <th className="px-3 py-2 text-right">{UsageClientFormatting.usageMetricLabel(metric)}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-medium text-gray-700 truncate max-w-[200px]">{row.label}</td>
                            <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                                {UsageClientFormatting.formatCompactNumber(row.calls)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                                {UsageClientFormatting.formatCompactNumber(row.tokens)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                                {UsageClientFormatting.formatUsageMetricValue(
                                    metric,
                                    UsageClientFormatting.resolveMetricValue(row, metric),
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Props for `<UsageClientDetailsTable/>`.
 */
type UsageClientDetailsTableProps = {
    headers: string[];
    rows: Array<ReactNode[]>;
    emptyLabel: string;
};

/**
 * Generic details table with flexible columns.
 */
function UsageClientDetailsTable(props: UsageClientDetailsTableProps) {
    const { headers, rows, emptyLabel } = props;

    if (rows.length === 0) {
        return <p className="mt-4 text-sm text-gray-500">{emptyLabel}</p>;
    }

    return (
        <div className="mt-4 max-h-80 overflow-auto rounded-md border border-gray-100">
            <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                        {headers.map((header, index) => (
                            <th key={index} className={`px-3 py-2 ${index > 0 ? 'text-right' : ''}`}>
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-gray-100">
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className={`px-3 py-2 text-gray-700 ${
                                        cellIndex > 0 ? 'text-right whitespace-nowrap' : 'font-medium truncate max-w-[200px]'
                                    }`}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
