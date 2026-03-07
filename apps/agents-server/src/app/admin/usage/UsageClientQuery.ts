import type {
    UsageActorType,
    UsageAnalyticsQuery,
    UsageCallType,
    UsageMetricMode,
    UsageTimeframePreset,
} from '@/src/utils/usageAdmin';

/**
 * Stateful filter values used for URL query synchronization.
 */
type UsageClientSearchState = {
    agentName: string;
    folderId: string;
    timeframe: UsageTimeframePreset;
    fromDate: string;
    toDate: string;
    callType: UsageCallType | '';
    actorType: UsageActorType | '';
    metric: UsageMetricMode;
};

/**
 * Stateful filter values used for usage analytics API requests.
 */
type UsageClientAnalyticsState = {
    agentName: string;
    folderId: string;
    timeframe: UsageTimeframePreset;
    fromDate: string;
    toDate: string;
    callType: UsageCallType | '';
    actorType: UsageActorType | '';
};

/**
 * Query-string and API-query builders for `<UsageClient/>`.
 * @private function of UsageClient
 */
export const UsageClientQuery = {
    buildSearchQuery(filters: UsageClientSearchState): string {
        const searchParams = new URLSearchParams();

        if (filters.agentName) {
            searchParams.set('agentName', filters.agentName);
        }
        if (filters.folderId) {
            searchParams.set('folderId', filters.folderId);
        }
        if (filters.timeframe) {
            searchParams.set('timeframe', filters.timeframe);
        }
        if (filters.timeframe === 'custom') {
            if (filters.fromDate) {
                searchParams.set('from', filters.fromDate);
            }
            if (filters.toDate) {
                searchParams.set('to', filters.toDate);
            }
        }
        if (filters.callType) {
            searchParams.set('callType', filters.callType);
        }
        if (filters.actorType) {
            searchParams.set('actorType', filters.actorType);
        }
        if (filters.metric) {
            searchParams.set('metric', filters.metric);
        }

        return searchParams.toString();
    },

    buildAnalyticsQuery(filters: UsageClientAnalyticsState): UsageAnalyticsQuery {
        return {
            timeframe: filters.timeframe,
            from: filters.timeframe === 'custom' ? filters.fromDate : undefined,
            to: filters.timeframe === 'custom' ? filters.toDate : undefined,
            agentName: filters.agentName || undefined,
            folderId: filters.folderId ? Number.parseInt(filters.folderId, 10) : null,
            callType: filters.callType || undefined,
            actorType: filters.actorType || undefined,
        };
    },
};
