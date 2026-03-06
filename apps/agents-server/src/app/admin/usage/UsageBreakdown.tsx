'use client';

import { Card } from '@/src/components/Homepage/Card';
import type { UsageBreakdownItem, UsageMetricMode } from '@/src/utils/usageAdmin';
import { formatUsageMetricValue, resolveMetricValue } from './usageFormatters';

/**
 * Props shared by usage breakdown sections.
 */
type UsageBreakdownProps<TKey extends string> = {
    title: string;
    items: UsageBreakdownItem<TKey>[];
    metric: UsageMetricMode;
    total: number;
    colorClass: (key: TKey) => string;
};

/**
 * Usage breakdown column that shows relative contributions for a metric.
 */
export function UsageBreakdown<TKey extends string>(props: UsageBreakdownProps<TKey>) {
    const { title, items, metric, total, colorClass } = props;

    return (
        <Card>
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            <div className="mt-4 space-y-3">
                {items.map((item) => (
                    <BreakdownRow
                        key={item.key}
                        label={item.label}
                        value={resolveMetricValue(item, metric)}
                        total={total}
                        metric={metric}
                        colorClass={colorClass(item.key)}
                    />
                ))}
            </div>
        </Card>
    );
}

/**
 * One horizontal row in a usage breakdown chart.
 * @private function of UsageBreakdown
 */
function BreakdownRow(props: {
    label: string;
    value: number;
    total: number;
    metric: UsageMetricMode;
    colorClass: string;
}) {
    const { label, value, total, metric, colorClass } = props;
    const percentage = total <= 0 ? 0 : (value / total) * 100;

    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700">{label}</span>
                <span className="font-medium text-gray-900">
                    {formatUsageMetricValue(metric, value)} ({percentage.toFixed(1)}%)
                </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min(100, percentage)}%` }} />
            </div>
        </div>
    );
}
