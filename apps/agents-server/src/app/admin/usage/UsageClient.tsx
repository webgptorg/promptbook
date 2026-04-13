'use client';

import { useAgentNaming } from '@/src/components/AgentNaming/AgentNamingContext';
import { Card } from '@/src/components/Homepage/Card';
import {
    type UsageActorType,
    type UsageAgentOption,
    type UsageCallType,
    type UsageFolderOption,
    type UsageMetricMode,
    type UsageTimeframePreset,
} from '@/src/utils/usageAdmin';
import { UsageClientAnalyticsPanels } from './UsageClientAnalyticsPanels';
import { UsageClientFiltersCard } from './UsageClientFiltersCard';
import { useUsageClientState } from './useUsageClientState';

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
    const { formatText } = useAgentNaming();
    const usageClientState = useUsageClientState(props);

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
                    agents={props.agents}
                    folders={props.folders}
                    selectedScopeLabel={usageClientState.selectedScopeLabel}
                    timeframeRangeLabel={usageClientState.timeframeRangeLabel}
                    agentName={usageClientState.agentName}
                    folderId={usageClientState.folderId}
                    timeframe={usageClientState.timeframe}
                    fromDate={usageClientState.fromDate}
                    toDate={usageClientState.toDate}
                    callType={usageClientState.callType}
                    actorType={usageClientState.actorType}
                    metric={usageClientState.metric}
                    onAgentNameChange={usageClientState.handleAgentNameChange}
                    onFolderIdChange={usageClientState.handleFolderIdChange}
                    onTimeframeChange={usageClientState.handleTimeframeChange}
                    onFromDateChange={usageClientState.handleFromDateChange}
                    onToDateChange={usageClientState.handleToDateChange}
                    onCallTypeChange={usageClientState.handleCallTypeChange}
                    onActorTypeChange={usageClientState.handleActorTypeChange}
                    onMetricChange={usageClientState.handleMetricChange}
                />
            </Card>

            {usageClientState.error ? (
                <Card>
                    <p className="text-sm text-red-700">{usageClientState.error}</p>
                </Card>
            ) : null}

            {usageClientState.loading ? (
                <Card>
                    <p className="text-sm text-gray-600">Loading usage analytics...</p>
                </Card>
            ) : null}

            {!usageClientState.loading && usageClientState.data && (
                <UsageClientAnalyticsPanels data={usageClientState.data} metric={usageClientState.metric} />
            )}
        </div>
    );
}
