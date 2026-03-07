import type { UsageAnalyticsResponse, UsageMetricMode } from '@/src/utils/usageAdmin';
import { useMemo } from 'react';
import { UsageClientFormatting } from './UsageClientFormatting';

/**
 * Timeline chart width in the SVG viewport.
 */
const TIMELINE_WIDTH = 760;

/**
 * Timeline chart height in the SVG viewport.
 */
const TIMELINE_HEIGHT = 240;

/**
 * Coordinate used when drawing timeline SVG paths.
 */
type UsageClientTimelinePoint = {
    x: number;
    y: number;
};

/**
 * Props for `<UsageClientTimelineChart/>`.
 */
type UsageClientTimelineChartProps = {
    points: UsageAnalyticsResponse['timeline'];
    metric: UsageMetricMode;
};

/**
 * Usage timeline chart.
 * @private function of UsageClient
 */
export function UsageClientTimelineChart(props: UsageClientTimelineChartProps) {
    const { points, metric } = props;

    const chartGeometry = useMemo(() => {
        const paddedWidth = TIMELINE_WIDTH;
        const paddedHeight = TIMELINE_HEIGHT;
        const paddingX = 26;
        const paddingY = 18;
        const usableWidth = paddedWidth - paddingX * 2;
        const usableHeight = paddedHeight - paddingY * 2;
        const maxMetricValue = Math.max(1, ...points.map((point) => UsageClientFormatting.resolveMetricValue(point, metric)));

        const coordinates: UsageClientTimelinePoint[] = points.map((point, index) => {
            const x =
                points.length <= 1
                    ? paddingX + usableWidth / 2
                    : paddingX + (index / (points.length - 1)) * usableWidth;
            const y =
                paddingY +
                usableHeight -
                (UsageClientFormatting.resolveMetricValue(point, metric) / maxMetricValue) * usableHeight;
            return { x, y };
        });

        return {
            coordinates,
            width: paddedWidth,
            height: paddedHeight,
            paddingX,
            paddingY,
            usableHeight,
        };
    }, [metric, points]);

    if (points.length === 0) {
        return <div className="py-10 text-sm text-gray-500">No usage in this timeframe.</div>;
    }

    const linePath = toLinePath(chartGeometry.coordinates);
    const areaPath = toAreaPath(chartGeometry.coordinates, chartGeometry.height - chartGeometry.paddingY);
    const firstLabel = UsageClientFormatting.formatShortDate(points[0].bucketStart);
    const middleLabel = UsageClientFormatting.formatShortDate(
        points[Math.floor(points.length / 2)]?.bucketStart || points[0].bucketStart,
    );
    const lastLabel = UsageClientFormatting.formatShortDate(points[points.length - 1].bucketStart);

    return (
        <div>
            <div className="w-full overflow-x-auto rounded-lg border border-gray-100 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-2">
                <svg
                    width="100%"
                    viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                    role="img"
                    aria-label="Usage timeline chart"
                >
                    <defs>
                        <linearGradient id="usage-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#0ea5e9" />
                            <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <linearGradient id="usage-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(37,99,235,0.34)" />
                            <stop offset="100%" stopColor="rgba(37,99,235,0.04)" />
                        </linearGradient>
                    </defs>

                    {[0.25, 0.5, 0.75].map((fraction) => {
                        const y = chartGeometry.paddingY + chartGeometry.usableHeight * fraction;
                        return (
                            <line
                                key={fraction}
                                x1={chartGeometry.paddingX}
                                x2={chartGeometry.width - chartGeometry.paddingX}
                                y1={y}
                                y2={y}
                                stroke="rgba(148,163,184,0.25)"
                                strokeDasharray="4 6"
                            />
                        );
                    })}

                    <path d={areaPath} fill="url(#usage-area-gradient)" />
                    <path d={linePath} fill="none" stroke="url(#usage-line-gradient)" strokeWidth="3.2" />
                    {chartGeometry.coordinates.map((point, index) => (
                        <circle
                            key={`${point.x}-${point.y}-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r={2.6}
                            fill="#1d4ed8"
                            opacity={index % Math.max(1, Math.floor(points.length / 18)) === 0 ? 1 : 0}
                        />
                    ))}
                </svg>
            </div>
            <div className="mt-2 grid grid-cols-3 text-xs text-gray-500">
                <span>{firstLabel}</span>
                <span className="text-center">{middleLabel}</span>
                <span className="text-right">{lastLabel}</span>
            </div>
        </div>
    );
}

/**
 * Builds SVG line path.
 */
function toLinePath(points: UsageClientTimelinePoint[]): string {
    if (points.length === 0) {
        return '';
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length; index++) {
        path += ` L ${points[index].x} ${points[index].y}`;
    }
    return path;
}

/**
 * Builds SVG area path down to chart baseline.
 */
function toAreaPath(points: UsageClientTimelinePoint[], baselineY: number): string {
    if (points.length === 0) {
        return '';
    }

    const first = points[0];
    const last = points[points.length - 1];
    return `${toLinePath(points)} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}
