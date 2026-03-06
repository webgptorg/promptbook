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
    type UsageMetricMode,
    type UsageTimeframePreset,
} from '@/src/utils/usageAdmin';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { UsageBreakdown } from './UsageBreakdown';
import { UsageDetailsTable } from './UsageDetailsTable';
import { UsageFilters } from './UsageFilters';
import { UsageSimpleCountTable } from './UsageSimpleCountTable';
import { UsageSummary } from './UsageSummary';
import { UsageTimeline } from './UsageTimeline';
import {
    actorTypeColorClass,
    callTypeColorClass,
    formatCompactNumber,
    formatDateTime,
    formatUsageMetricValue,
    formatUsageUserLabel,
    resolveMetricValue,
    resolveSummaryMetricValue,
    truncateMiddle,
    usageMetricDescription,
    usageMetricLabel,
} from './usageFormatters';

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
    initialMetric: UsageMetricMode;
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
        initialMetric,
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
    const [metric, setMetric] = useState<UsageMetricMode>(initialMetric);
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
        if (metric) {
            searchParams.set('metric', metric);
        }

        const query = searchParams.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [agentName, actorType, callType, folderId, fromDate, metric, pathname, router, timeframe, toDate]);

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
    }, [agentName, actorType, callType, timeframe, fromDate, folderId, isCustomRangeInvalid, toDate]);

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

    const rangeFrom = data ? formatDateTime(data.timeframe.from) : undefined;
    const rangeTo = data ? formatDateTime(data.timeframe.to) : undefined;

    const handleAgentChange = (value: string) => {
        setAgentName(value);
        if (value) {
            setFolderId('');
        }
    };

    const handleFolderChange = (value: string) => {
        setFolderId(value);
        if (value) {
            setAgentName('');
        }
    };

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

            <UsageFilters
                agents={agents}
                folders={folders}
                agentName={agentName}
                folderId={folderId}
                timeframe={timeframe}
                fromDate={fromDate}
                toDate={toDate}
                callType={callType}
                actorType={actorType}
                metric={metric}
                selectedScopeLabel={selectedScopeLabel}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                onAgentChange={handleAgentChange}
                onFolderChange={handleFolderChange}
                onTimeframeChange={(value) => setTimeframe(value)}
                onFromChange={(value) => setFromDate(value)}
                onToChange={(value) => setToDate(value)}
                onCallTypeChange={(value) => setCallType(value)}
                onActorTypeChange={(value) => setActorType(value)}
                onMetricChange={(value) => setMetric(value)}
            />

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
                    <UsageSummary summary={data.summary} metric={metric} />

                    <Card className="overflow-hidden">
                        <div className="mb-3">
                            <h2 className="text-xl font-medium text-gray-900">{usageMetricLabel(metric)} over time</h2>
                            <p className="text-sm text-gray-500">
                                {usageMetricDescription(metric)} in the selected timeframe.
                            </p>
                        </div>
                        <UsageTimeline points={data.timeline} metric={metric} />
                    </Card>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <UsageBreakdown
                            title="By call type"
                            items={data.breakdownByCallType}
                            metric={metric}
                            total={resolveSummaryMetricValue(data.summary, metric)}
                            colorClass={callTypeColorClass}
                        />
                        <UsageBreakdown
                            title="By actor type"
                            items={data.breakdownByActorType}
                            metric={metric}
                            total={resolveSummaryMetricValue(data.summary, metric)}
                            colorClass={actorTypeColorClass}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <Card>
                            <h2 className="text-lg font-medium text-gray-900">Per agent</h2>
                            <UsageSimpleCountTable
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
                            <UsageSimpleCountTable
                                emptyLabel="No user usage for current filters."
                                metric={metric}
                                rows={data.perUser.map((item) => ({
                                    label: formatUsageUserLabel(item.username),
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
                            <UsageSimpleCountTable
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
                            <UsageDetailsTable
                                emptyLabel="No API key usage for current filters."
                                headers={['API key', 'Calls', 'Tokens', usageMetricLabel(metric), 'Last seen']}
                                rows={data.apiKeys.map((item) => [
                                    `${truncateMiddle(item.apiKey, 12, 8)}${item.note ? ` (${item.note})` : ''}`,
                                    formatCompactNumber(item.calls),
                                    formatCompactNumber(item.tokens),
                                    formatUsageMetricValue(metric, resolveMetricValue(item, metric)),
                                    formatDateTime(item.lastSeen),
                                ])}
                            />
                        </Card>

                        <Card>
                            <h2 className="text-lg font-medium text-gray-900">User agent details</h2>
                            <UsageDetailsTable
                                emptyLabel="No user-agent usage for current filters."
                                headers={['User agent', 'Calls', 'Tokens', usageMetricLabel(metric), 'Last seen']}
                                rows={data.userAgents.map((item) => [
                                    item.userAgent || 'Unknown',
                                    formatCompactNumber(item.calls),
                                    formatCompactNumber(item.tokens),
                                    formatUsageMetricValue(metric, resolveMetricValue(item, metric)),
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
 * Returns true when date input value is YYYY-MM-DD.
 * @private function of UsageClient
 */
function isIsoDateInputValue(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
