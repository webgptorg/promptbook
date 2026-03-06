'use client';

import type { UsageMetricMode } from '@/src/utils/usageAdmin';
import {
    formatCompactNumber,
    formatUsageMetricValue,
    resolveMetricValue,
    usageMetricLabel,
} from './usageFormatters';

/**
 * Props for the simple count table.
 */
type UsageSimpleCountTableProps = {
    rows: Array<{
        label: string;
        calls: number;
        tokens: number;
        priceUsd: number;
        duration: number;
        humanDuration: number;
    }>;
    metric: UsageMetricMode;
    emptyLabel: string;
};

/**
 * Small two-column count table for agents, users, or folders.
 */
export function UsageSimpleCountTable(props: UsageSimpleCountTableProps) {
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
                        <th className="px-3 py-2 text-right">{usageMetricLabel(metric)}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-medium text-gray-700 truncate max-w-[200px]">
                                {row.label}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                                {formatCompactNumber(row.calls)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                                {formatCompactNumber(row.tokens)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                                {formatUsageMetricValue(metric, resolveMetricValue(row, metric))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
