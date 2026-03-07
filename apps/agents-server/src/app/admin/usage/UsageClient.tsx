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
import { UsageClientAnalyticsPanels } from './UsageClientAnalyticsPanels';
import { UsageClientFiltersCard } from './UsageClientFiltersCard';
import { UsageClientFormatting } from './UsageClientFormatting';
import { UsageClientQuery } from './UsageClientQuery';

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
        timeframe === 'custom' &&
        (!UsageClientFormatting.isIsoDateInputValue(fromDate) ||
            !UsageClientFormatting.isIsoDateInputValue(toDate) ||
            fromDate > toDate);

    useEffect(() => {
        const query = UsageClientQuery.buildSearchQuery({
            agentName,
            folderId,
            timeframe,
            fromDate,
            toDate,
            callType,
            actorType,
            metric,
        });
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [agentName, folderId, timeframe, fromDate, toDate, callType, actorType, metric, pathname, router]);

    useEffect(() => {
        if (isCustomRangeInvalid) {
            setError('Custom timeframe is invalid. Please select a valid start and end date.');
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        $fetchUsageAnalytics(
            UsageClientQuery.buildAnalyticsQuery({
                agentName,
                folderId,
                timeframe,
                fromDate,
                toDate,
                callType,
                actorType,
            }),
        )
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

    const timeframeRangeLabel = useMemo(() => {
        if (!data) {
            return null;
        }

        return `${UsageClientFormatting.formatDateTime(data.timeframe.from)} - ${UsageClientFormatting.formatDateTime(
            data.timeframe.to,
        )}`;
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
                <UsageClientFiltersCard
                    agents={agents}
                    folders={folders}
                    selectedScopeLabel={selectedScopeLabel}
                    timeframeRangeLabel={timeframeRangeLabel}
                    agentName={agentName}
                    folderId={folderId}
                    timeframe={timeframe}
                    fromDate={fromDate}
                    toDate={toDate}
                    callType={callType}
                    actorType={actorType}
                    metric={metric}
                    onAgentNameChange={(value) => {
                        setAgentName(value);
                        if (value) {
                            setFolderId('');
                        }
                    }}
                    onFolderIdChange={(value) => {
                        setFolderId(value);
                        if (value) {
                            setAgentName('');
                        }
                    }}
                    onTimeframeChange={setTimeframe}
                    onFromDateChange={setFromDate}
                    onToDateChange={setToDate}
                    onCallTypeChange={setCallType}
                    onActorTypeChange={setActorType}
                    onMetricChange={setMetric}
                />
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

            {!loading && data && <UsageClientAnalyticsPanels data={data} metric={metric} />}
        </div>
    );
}
