'use client';

import { useAgentNaming } from '@/src/components/AgentNaming/AgentNamingContext';
import { Card } from '@/src/components/Homepage/Card';
import {
    $fetchUsageAnalytics,
    type UsageActorType,
    type UsageAgentOption,
    type UsageAnalyticsResponse,
    type UsageCallType,
    type UsageFolderOption,
    type UsageTimeframePreset,
} from '@/src/utils/usageAdmin';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

/**
 * Timeline chart dimensions.
 */
const TIMELINE_WIDTH = 760;

/**
 * Timeline chart dimensions.
 */
const TIMELINE_HEIGHT = 240;

/**
 * Timeframe options exposed in the UI.
 */
const TIMEFRAME_OPTIONS: Array<{ value: UsageTimeframePreset; label: string }> = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'custom', label: 'Custom range' },
];

/**
 * Props for the admin usage client page.
 */
type UsageClientProps = {
    folders: UsageFolderOption[];
    agents: UsageAgentOption[];
    initialAgentName: string | null;
    initialFolderId: number | null;
    initialTimeframe: UsageTimeframePreset;
    initialFrom: string | null;
    initialTo: string | null;
    initialCallType: UsageCallType | null;
    initialActorType: UsageActorType | null;
};

/**
 * Coordinate used when drawing the timeline SVG path.
 */
type TimelinePoint = {
    x: number;
    y: number;
};

/**
 * Admin usage analytics page client.
 */
export function UsageClient(props: UsageClientProps) {
    const {
        folders,
        agents,
        initialAgentName,
        initialFolderId,
        initialTimeframe,
        initialFrom,
        initialTo,
        initialCallType,
        initialActorType,
    } = props;
    const router = useRouter();
    const pathname = usePathname();
    const { formatText } = useAgentNaming();

    const [agentName, setAgentName] = useState<string>(initialAgentName || '');
    const [folderId, setFolderId] = useState<string>(initialFolderId ? String(initialFolderId) : '');
    const [timeframe, setTimeframe] = useState<UsageTimeframePreset>(initialTimeframe);
    const [fromDate, setFromDate] = useState<string>(initialFrom || '');
    const [toDate, setToDate] = useState<string>(initialTo || '');
    const [callType, setCallType] = useState<UsageCallType | ''>(initialCallType || '');
    const [actorType, setActorType] = useState<UsageActorType | ''>(initialActorType || '');
    const [data, setData] = useState<UsageAnalyticsResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const isCustomRangeInvalid =
        timeframe === 'custom' && (!isIsoDateInputValue(fromDate) || !isIsoDateInputValue(toDate) || fromDate > toDate);

    useEffect(() => {
        const searchParams = new URLSearchParams();
        if (agentName) {
            searchParams.set('agentName', agentName);
        }
        if (folderId) {
            searchParams.set('folderId', folderId);
        }
        if (timeframe) {
            searchParams.set('timeframe', timeframe);
        }
        if (timeframe === 'custom') {
            if (fromDate) {
                searchParams.set('from', fromDate);
            }
            if (toDate) {
                searchParams.set('to', toDate);
            }
        }
        if (callType) {
            searchParams.set('callType', callType);
        }
        if (actorType) {
            searchParams.set('actorType', actorType);
        }

        const query = searchParams.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [agentName, folderId, timeframe, fromDate, toDate, callType, actorType, pathname, router]);

    useEffect(() => {
        if (isCustomRangeInvalid) {
            setError('Custom timeframe is invalid. Please select a valid start and end date.');
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        $fetchUsageAnalytics({
            timeframe,
            from: timeframe === 'custom' ? fromDate : undefined,
            to: timeframe === 'custom' ? toDate : undefined,
            agentName: agentName || undefined,
            folderId: folderId ? Number.parseInt(folderId, 10) : null,
            callType: callType || undefined,
            actorType: actorType || undefined,
        })
            .then((response) => {
                if (cancelled) {
                    return;
                }
                setData(response);
            })
            .catch((fetchError) => {
                if (cancelled) {
                    return;
                }
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load usage analytics');
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [agentName, folderId, timeframe, fromDate, toDate, callType, actorType, isCustomRangeInvalid]);

    const selectedScopeLabel = useMemo(() => {
        if (agentName) {
            const selectedAgent = agents.find((agent) => agent.agentName === agentName);
            return selectedAgent?.fullname || selectedAgent?.agentName || agentName;
        }

        if (folderId) {
            const selectedFolder = folders.find((folder) => String(folder.id) === folderId);
            return selectedFolder?.name || `Folder #${folderId}`;
        }

        return 'Entire server';
    }, [agentName, agents, folderId, folders]);

    const summaryItems = useMemo(() => {
        if (!data) {
            return [];
        }

        return [
            { label: 'Total calls', value: formatCompactNumber(data.summary.totalCalls) },
            { label: 'Agents involved', value: formatCompactNumber(data.summary.uniqueAgents) },
            { label: 'API keys used', value: formatCompactNumber(data.summary.uniqueApiKeys) },
            { label: 'User agents', value: formatCompactNumber(data.summary.uniqueUserAgents) },
        ];
    }, [data]);

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="mt-20 mb-2">
                <h1 className="text-3xl font-light text-gray-900">Usage analytics</h1>
                <p className="mt-1 text-sm text-gray-500">
                    {formatText(
                        'Inspect agent usage across the whole server with filters for scope, timeframe, call type, and actor attribution.',
                    )}
                </p>
            </div>

            <Card>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="usage-agent" className="text-sm font-medium text-gray-700">
                            Agent
                        </label>
                        <select
                            id="usage-agent"
                            value={agentName}
                            onChange={(event) => {
                                const value = event.target.value;
                                setAgentName(value);
                                if (value) {
                                    setFolderId('');
                                }
                            }}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="">All agents</option>
                            {agents.map((agent) => (
                                <option key={agent.agentName} value={agent.agentName}>
                                    {agent.fullname ? `${agent.fullname} (${agent.agentName})` : agent.agentName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="usage-folder" className="text-sm font-medium text-gray-700">
                            Folder
                        </label>
                        <select
                            id="usage-folder"
                            value={folderId}
                            onChange={(event) => {
                                const value = event.target.value;
                                setFolderId(value);
                                if (value) {
                                    setAgentName('');
                                }
                            }}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="">Entire server</option>
                            {folders.map((folder) => (
                                <option key={folder.id} value={String(folder.id)}>
                                    {folder.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="usage-timeframe" className="text-sm font-medium text-gray-700">
                            Timeframe
                        </label>
                        <select
                            id="usage-timeframe"
                            value={timeframe}
                            onChange={(event) => setTimeframe(event.target.value as UsageTimeframePreset)}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            {TIMEFRAME_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {timeframe === 'custom' && (
                        <>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="usage-from-date" className="text-sm font-medium text-gray-700">
                                    From
                                </label>
                                <input
                                    id="usage-from-date"
                                    type="date"
                                    value={fromDate}
                                    onChange={(event) => setFromDate(event.target.value)}
                                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="usage-to-date" className="text-sm font-medium text-gray-700">
                                    To
                                </label>
                                <input
                                    id="usage-to-date"
                                    type="date"
                                    value={toDate}
                                    onChange={(event) => setToDate(event.target.value)}
                                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex flex-col gap-1">
                        <label htmlFor="usage-call-type" className="text-sm font-medium text-gray-700">
                            Call type
                        </label>
                        <select
                            id="usage-call-type"
                            value={callType}
                            onChange={(event) => setCallType((event.target.value as UsageCallType) || '')}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="">All call types</option>
                            <option value="WEB_CHAT">Web chat</option>
                            <option value="VOICE_CHAT">Voice chat</option>
                            <option value="COMPATIBLE_API">Compatible API</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="usage-actor-type" className="text-sm font-medium text-gray-700">
                            Actor type
                        </label>
                        <select
                            id="usage-actor-type"
                            value={actorType}
                            onChange={(event) => setActorType((event.target.value as UsageActorType) || '')}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="">All actors</option>
                            <option value="ANONYMOUS">Anonymous</option>
                            <option value="TEAM_MEMBER">Team member</option>
                            <option value="API_KEY">API key</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                        Scope: {selectedScopeLabel}
                    </span>
                    {data && (
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                            Range: {formatDateTime(data.timeframe.from)} - {formatDateTime(data.timeframe.to)}
                        </span>
                    )}
                </div>
            </Card>

            {error ? (
                <Card>
                    <p className="text-sm text-red-700">{error}</p>
                </Card>
            ) : null}

            {loading ? (
                <Card>
                    <p className="text-sm text-gray-600">Loading usage analytics...</p>
                </Card>
            ) : null}

            {!loading && data && (
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
                            <h2 className="text-xl font-medium text-gray-900">Calls over time</h2>
                            <p className="text-sm text-gray-500">User call volume in the selected timeframe.</p>
                        </div>
                        <TimelineChart points={data.timeline} />
                    </Card>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card>
                            <h2 className="text-lg font-medium text-gray-900">By call type</h2>
                            <div className="mt-4 space-y-3">
                                {data.breakdownByCallType.map((item) => (
                                    <BreakdownRow
                                        key={item.key}
                                        label={item.label}
                                        value={item.calls}
                                        total={data.summary.totalCalls}
                                        colorClass={callTypeColorClass(item.key)}
                                    />
                                ))}
                            </div>
                        </Card>
                        <Card>
                            <h2 className="text-lg font-medium text-gray-900">By actor type</h2>
                            <div className="mt-4 space-y-3">
                                {data.breakdownByActorType.map((item) => (
                                    <BreakdownRow
                                        key={item.key}
                                        label={item.label}
                                        value={item.calls}
                                        total={data.summary.totalCalls}
                                        colorClass={actorTypeColorClass(item.key)}
                                    />
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <Card>
                            <h2 className="text-lg font-medium text-gray-900">Per agent</h2>
                            <SimpleCountTable
                                emptyLabel="No agent usage for current filters."
                                rows={data.perAgent.map((item) => ({ label: item.agentName, value: item.calls }))}
                            />
                        </Card>

                        <Card>
                            <h2 className="text-lg font-medium text-gray-900">Per folder</h2>
                            <SimpleCountTable
                                emptyLabel="No folder usage for current filters."
                                rows={data.perFolder.map((item) => ({ label: item.folderName, value: item.calls }))}
                            />
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <Card>
                            <h2 className="text-lg font-medium text-gray-900">API key details</h2>
                            <DetailsTable
                                emptyLabel="No API key usage for current filters."
                                headers={['API key', 'Calls', 'Last seen']}
                                rows={data.apiKeys.map((item) => [
                                    `${truncateMiddle(item.apiKey, 12, 8)}${item.note ? ` (${item.note})` : ''}`,
                                    formatCompactNumber(item.calls),
                                    formatDateTime(item.lastSeen),
                                ])}
                            />
                        </Card>

                        <Card>
                            <h2 className="text-lg font-medium text-gray-900">User agent details</h2>
                            <DetailsTable
                                emptyLabel="No user-agent usage for current filters."
                                headers={['User agent', 'Calls', 'Last seen']}
                                rows={data.userAgents.map((item) => [
                                    truncateMiddle(item.userAgent, 42, 18),
                                    formatCompactNumber(item.calls),
                                    formatDateTime(item.lastSeen),
                                ])}
                            />
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Usage timeline chart.
 */
function TimelineChart(props: { points: UsageAnalyticsResponse['timeline'] }) {
    const { points } = props;

    const chartGeometry = useMemo(() => {
        const paddedWidth = TIMELINE_WIDTH;
        const paddedHeight = TIMELINE_HEIGHT;
        const paddingX = 26;
        const paddingY = 18;
        const usableWidth = paddedWidth - paddingX * 2;
        const usableHeight = paddedHeight - paddingY * 2;
        const maxCalls = Math.max(1, ...points.map((point) => point.calls));

        const coordinates: TimelinePoint[] = points.map((point, index) => {
            const x =
                points.length <= 1
                    ? paddingX + usableWidth / 2
                    : paddingX + (index / (points.length - 1)) * usableWidth;
            const y = paddingY + usableHeight - (point.calls / maxCalls) * usableHeight;
            return { x, y };
        });

        return {
            coordinates,
            maxCalls,
            width: paddedWidth,
            height: paddedHeight,
            paddingX,
            paddingY,
            usableHeight,
        };
    }, [points]);

    if (points.length === 0) {
        return <div className="py-10 text-sm text-gray-500">No calls in this timeframe.</div>;
    }

    const linePath = toLinePath(chartGeometry.coordinates);
    const areaPath = toAreaPath(chartGeometry.coordinates, chartGeometry.height - chartGeometry.paddingY);
    const firstLabel = formatShortDate(points[0].bucketStart);
    const middleLabel = formatShortDate(points[Math.floor(points.length / 2)]?.bucketStart || points[0].bucketStart);
    const lastLabel = formatShortDate(points[points.length - 1].bucketStart);

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
 * One horizontal row in a usage breakdown chart.
 */
function BreakdownRow(props: {
    label: string;
    value: number;
    total: number;
    colorClass: string;
}) {
    const { label, value, total, colorClass } = props;
    const percentage = total <= 0 ? 0 : (value / total) * 100;

    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700">{label}</span>
                <span className="font-medium text-gray-900">
                    {formatCompactNumber(value)} ({percentage.toFixed(1)}%)
                </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min(100, percentage)}%` }} />
            </div>
        </div>
    );
}

/**
 * Small two-column count table.
 */
function SimpleCountTable(props: {
    rows: Array<{ label: string; value: number }>;
    emptyLabel: string;
}) {
    const { rows, emptyLabel } = props;

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
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-800">{row.label}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                                {formatCompactNumber(row.value)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Generic details table with three columns.
 */
function DetailsTable(props: {
    headers: [string, string, string];
    rows: Array<[string, string, string]>;
    emptyLabel: string;
}) {
    const { headers, rows, emptyLabel } = props;

    if (rows.length === 0) {
        return <p className="mt-4 text-sm text-gray-500">{emptyLabel}</p>;
    }

    return (
        <div className="mt-4 max-h-80 overflow-auto rounded-md border border-gray-100">
            <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                        <th className="px-3 py-2">{headers[0]}</th>
                        <th className="px-3 py-2 text-right">{headers[1]}</th>
                        <th className="px-3 py-2 text-right">{headers[2]}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${row[0]}-${index}`} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-800">{row[0]}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">{row[1]}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{row[2]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Builds SVG line path.
 */
function toLinePath(points: TimelinePoint[]): string {
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
function toAreaPath(points: TimelinePoint[], baselineY: number): string {
    if (points.length === 0) {
        return '';
    }

    const first = points[0];
    const last = points[points.length - 1];
    return `${toLinePath(points)} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

/**
 * Formats ISO datetime for readable tables.
 */
function formatDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleString();
}

/**
 * Formats date labels for timeline axis.
 */
function formatShortDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleDateString();
}

/**
 * Formats numeric values for compact summary visuals.
 */
function formatCompactNumber(value: number): string {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/**
 * Returns true when date input value is YYYY-MM-DD.
 */
function isIsoDateInputValue(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Truncates long labels while preserving start and end segments.
 */
function truncateMiddle(value: string, head: number, tail: number): string {
    if (value.length <= head + tail + 3) {
        return value;
    }
    return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

/**
 * Tailwind color class for call-type bars.
 */
function callTypeColorClass(callType: UsageCallType): string {
    if (callType === 'VOICE_CHAT') {
        return 'bg-gradient-to-r from-teal-500 to-emerald-500';
    }
    if (callType === 'COMPATIBLE_API') {
        return 'bg-gradient-to-r from-indigo-500 to-blue-600';
    }
    return 'bg-gradient-to-r from-sky-500 to-cyan-500';
}

/**
 * Tailwind color class for actor-type bars.
 */
function actorTypeColorClass(actorType: UsageActorType): string {
    if (actorType === 'TEAM_MEMBER') {
        return 'bg-gradient-to-r from-amber-500 to-orange-500';
    }
    if (actorType === 'API_KEY') {
        return 'bg-gradient-to-r from-fuchsia-500 to-pink-500';
    }
    return 'bg-gradient-to-r from-slate-500 to-slate-700';
}
