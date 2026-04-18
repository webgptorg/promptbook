import type { UsageAnalyticsResponse } from '../usageAdmin';
import type { UsageAnalyticsAggregationState } from './UsageAnalyticsAggregationState';
import { UsageAnalyticsAggregateMath } from './UsageAnalyticsAggregateMath';
import {
    UsageAnalyticsModel,
    type UsageAnalyticsAggregate,
    type UsageAnalyticsAggregateWithLastSeen,
    type UsageAnalyticsCall,
    type UsageAnalyticsRequestFilters,
    type UsageAnalyticsTimeframe,
} from './UsageAnalyticsModel';
import { UsageAnalyticsQuery } from './UsageAnalyticsQuery';

/**
 * Max number of detailed rows returned per high-cardinality usage section.
 */
const USAGE_ANALYTICS_DETAIL_LIMIT = 25;

/**
 * Formats aggregated usage analytics state into API responses.
 *
 * @private function of UsageAnalyticsAggregation
 */
export const UsageAnalyticsAggregationFormatter = {
    createEmptyUsageAnalyticsResponse(options: {
        timeframe: UsageAnalyticsTimeframe;
        filters: UsageAnalyticsRequestFilters;
    }): UsageAnalyticsResponse {
        return {
            timeframe: options.timeframe.serialized,
            filters: options.filters,
            summary: createEmptyUsageAnalyticsSummary(),
            timeline: [],
            breakdownByCallType: createUsageCallTypeBreakdown(
                new Map<UsageAnalyticsCall['callType'], UsageAnalyticsAggregate>(),
            ),
            breakdownByActorType: createUsageActorTypeBreakdown(
                new Map<UsageAnalyticsCall['actorType'], UsageAnalyticsAggregate>(),
            ),
            perAgent: [],
            perFolder: [],
            perUser: [],
            apiKeys: [],
            userAgents: [],
        };
    },

    createUsageAnalyticsResponse(options: {
        timeframe: UsageAnalyticsTimeframe;
        filters: UsageAnalyticsRequestFilters;
        aggregationState: UsageAnalyticsAggregationState;
        folderById: ReadonlyMap<number, { name: string }>;
        usernamesById: ReadonlyMap<number, string>;
        apiKeyNotes: ReadonlyMap<string, string | null>;
    }): UsageAnalyticsResponse {
        const { timeframe, filters, aggregationState, folderById, usernamesById, apiKeyNotes } = options;
        const perUser = createUsagePerUserItems(aggregationState.perUserCounts, usernamesById);
        const apiKeys = createUsageApiKeyItems(aggregationState.apiKeyDetails, apiKeyNotes);
        const userAgents = createUsageUserAgentItems(aggregationState.userAgentDetails);

        return {
            timeframe: timeframe.serialized,
            filters,
            summary: createUsageAnalyticsSummary(aggregationState),
            timeline: createTimelineSeries({
                from: timeframe.from.getTime(),
                to: timeframe.to.getTime(),
                bucketSizeMs: aggregationState.bucketSizeMs,
                timelineByBucket: aggregationState.timelineByBucket,
            }),
            breakdownByCallType: createUsageCallTypeBreakdown(aggregationState.callTypeCounts),
            breakdownByActorType: createUsageActorTypeBreakdown(aggregationState.actorTypeCounts),
            perAgent: createUsagePerAgentItems(aggregationState.perAgentCounts),
            perFolder: createUsagePerFolderItems(aggregationState.perFolderCounts, folderById),
            perUser: perUser.slice(0, USAGE_ANALYTICS_DETAIL_LIMIT),
            apiKeys: apiKeys.slice(0, USAGE_ANALYTICS_DETAIL_LIMIT),
            userAgents: userAgents.slice(0, USAGE_ANALYTICS_DETAIL_LIMIT),
        };
    },
};

/**
 * Builds an all-zero usage summary payload.
 */
function createEmptyUsageAnalyticsSummary(): UsageAnalyticsResponse['summary'] {
    return {
        totalCalls: 0,
        totalTokens: 0,
        totalPriceUsd: 0,
        totalDuration: 0,
        totalHumanDuration: 0,
        uniqueAgents: 0,
        uniqueUsers: 0,
        uniqueApiKeys: 0,
        uniqueUserAgents: 0,
    };
}

/**
 * Builds the final summary block from aggregated counts and totals.
 */
function createUsageAnalyticsSummary(
    aggregationState: UsageAnalyticsAggregationState,
): UsageAnalyticsResponse['summary'] {
    return {
        ...aggregationState.summaryTotals,
        uniqueAgents: aggregationState.perAgentCounts.size,
        uniqueUsers: countAttributedUsageUsers(aggregationState.perUserCounts),
        uniqueApiKeys: aggregationState.apiKeyDetails.size,
        uniqueUserAgents: aggregationState.userAgentDetails.size,
    };
}

/**
 * Counts unique non-null user ids represented in the per-user bucket map.
 */
function countAttributedUsageUsers(
    perUserCounts: ReadonlyMap<number | null, UsageAnalyticsAggregateWithLastSeen>,
): number {
    return new Set([...perUserCounts.keys()].filter((userId): userId is number => typeof userId === 'number')).size;
}

/**
 * Builds the call-type breakdown array in the configured display order.
 */
function createUsageCallTypeBreakdown(
    callTypeCounts: ReadonlyMap<UsageAnalyticsCall['callType'], UsageAnalyticsAggregate>,
): UsageAnalyticsResponse['breakdownByCallType'] {
    return UsageAnalyticsModel.CALL_TYPES.map((key) =>
        createUsageBreakdownItem(key, UsageAnalyticsQuery.callTypeLabel(key), callTypeCounts.get(key)),
    );
}

/**
 * Builds the actor-type breakdown array in the configured display order.
 */
function createUsageActorTypeBreakdown(
    actorTypeCounts: ReadonlyMap<UsageAnalyticsCall['actorType'], UsageAnalyticsAggregate>,
): UsageAnalyticsResponse['breakdownByActorType'] {
    return UsageAnalyticsModel.ACTOR_TYPES.map((key) =>
        createUsageBreakdownItem(key, UsageAnalyticsQuery.actorTypeLabel(key), actorTypeCounts.get(key)),
    );
}

/**
 * Formats one labeled breakdown item with zero fallback.
 */
function createUsageBreakdownItem<TKey extends string>(
    key: TKey,
    label: string,
    usageAggregate: UsageAnalyticsAggregate | undefined,
) {
    return {
        key,
        label,
        ...UsageAnalyticsAggregateMath.resolveUsageAggregate(usageAggregate),
    };
}

/**
 * Formats per-agent usage items sorted by calls and agent name.
 */
function createUsagePerAgentItems(
    perAgentCounts: ReadonlyMap<string, UsageAnalyticsAggregate>,
): UsageAnalyticsResponse['perAgent'] {
    return [...perAgentCounts.entries()]
        .map(([agentName, usageAggregate]) => ({ agentName, ...usageAggregate }))
        .sort((firstItem, secondItem) => {
            return secondItem.calls - firstItem.calls || firstItem.agentName.localeCompare(secondItem.agentName);
        });
}

/**
 * Formats per-folder usage items sorted by calls and folder name.
 */
function createUsagePerFolderItems(
    perFolderCounts: ReadonlyMap<number | null, UsageAnalyticsAggregate>,
    folderById: ReadonlyMap<number, { name: string }>,
): UsageAnalyticsResponse['perFolder'] {
    return [...perFolderCounts.entries()]
        .map(([folderId, usageAggregate]) => ({
            folderId,
            folderName: folderId === null ? 'Root folder' : folderById.get(folderId)?.name || `Folder #${folderId}`,
            ...usageAggregate,
        }))
        .sort((firstItem, secondItem) => {
            return secondItem.calls - firstItem.calls || firstItem.folderName.localeCompare(secondItem.folderName);
        });
}

/**
 * Formats per-user usage items sorted by calls and recency.
 */
function createUsagePerUserItems(
    perUserCounts: ReadonlyMap<number | null, UsageAnalyticsAggregateWithLastSeen>,
    usernamesById: ReadonlyMap<number, string>,
): UsageAnalyticsResponse['perUser'] {
    return [...perUserCounts.entries()]
        .map(([userId, usageAggregate]) => ({
            userId,
            username: resolveUsageUsername(userId, usernamesById),
            ...usageAggregate,
        }))
        .sort(compareUsageDetailsByCallsAndLastSeen);
}

/**
 * Formats API-key usage items sorted by calls and recency.
 */
function createUsageApiKeyItems(
    apiKeyDetails: ReadonlyMap<string, UsageAnalyticsAggregateWithLastSeen>,
    apiKeyNotes: ReadonlyMap<string, string | null>,
): UsageAnalyticsResponse['apiKeys'] {
    return [...apiKeyDetails.entries()]
        .map(([apiKey, usageAggregate]) => ({
            apiKey,
            note: apiKeyNotes.get(apiKey) || null,
            ...usageAggregate,
        }))
        .sort(compareUsageDetailsByCallsAndLastSeen);
}

/**
 * Formats user-agent usage items sorted by calls and recency.
 */
function createUsageUserAgentItems(
    userAgentDetails: ReadonlyMap<string, UsageAnalyticsAggregateWithLastSeen>,
): UsageAnalyticsResponse['userAgents'] {
    return [...userAgentDetails.entries()]
        .map(([userAgent, usageAggregate]) => ({ userAgent, ...usageAggregate }))
        .sort(compareUsageDetailsByCallsAndLastSeen);
}

/**
 * Orders usage detail rows by descending calls and then descending recency.
 */
function compareUsageDetailsByCallsAndLastSeen<TItem extends { calls: number; lastSeen: string }>(
    firstItem: TItem,
    secondItem: TItem,
): number {
    return secondItem.calls - firstItem.calls || secondItem.lastSeen.localeCompare(firstItem.lastSeen);
}

/**
 * Builds a timeline series with zero-filled buckets.
 */
function createTimelineSeries(options: {
    from: number;
    to: number;
    bucketSizeMs: number;
    timelineByBucket: Map<number, UsageAnalyticsAggregate>;
}): UsageAnalyticsResponse['timeline'] {
    const { from, to, bucketSizeMs, timelineByBucket } = options;
    if (to < from) {
        return [];
    }

    const points: UsageAnalyticsResponse['timeline'] = [];
    const start = UsageAnalyticsQuery.floorToBucket(from, bucketSizeMs);
    const end = UsageAnalyticsQuery.floorToBucket(to, bucketSizeMs);

    for (let cursor = start; cursor <= end; cursor += bucketSizeMs) {
        const usageAggregate = UsageAnalyticsAggregateMath.resolveUsageAggregate(timelineByBucket.get(cursor));
        points.push({
            bucketStart: new Date(cursor).toISOString(),
            ...usageAggregate,
        });
    }

    return points;
}

/**
 * Resolves the display name used for one usage user bucket.
 */
function resolveUsageUsername(userId: number | null, usernamesById: ReadonlyMap<number, string>): string {
    if (userId === null) {
        return '(unattributed user)';
    }

    return usernamesById.get(userId) || `User #${userId}`;
}
