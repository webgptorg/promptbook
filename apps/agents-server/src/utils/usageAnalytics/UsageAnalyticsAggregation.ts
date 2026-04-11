import type { UsageAnalyticsResponse } from '../usageAdmin';
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
 * Full response construction options for usage analytics.
 */
export type UsageAnalyticsResponseOptions = {
    timeframe: UsageAnalyticsTimeframe;
    filters: UsageAnalyticsRequestFilters;
    filteredCalls: UsageAnalyticsCall[];
    folderById: ReadonlyMap<number, { name: string }>;
    agentFolderByName: ReadonlyMap<string, number | null>;
    usernamesById: ReadonlyMap<number, string>;
    apiKeyNotes: ReadonlyMap<string, string | null>;
};

/**
 * Per-call usage values accumulated across grouped usage buckets.
 */
type UsageAnalyticsUsageValues = Omit<UsageAnalyticsAggregate, 'calls'>;

/**
 * Rolling summary totals accumulated across all filtered calls.
 */
type UsageAnalyticsSummaryTotals = Pick<
    UsageAnalyticsResponse['summary'],
    'totalCalls' | 'totalTokens' | 'totalPriceUsd' | 'totalDuration' | 'totalHumanDuration'
>;

/**
 * Mutable state built while aggregating usage analytics calls.
 */
type UsageAnalyticsAggregationState = {
    bucketSizeMs: number;
    summaryTotals: UsageAnalyticsSummaryTotals;
    timelineByBucket: Map<number, UsageAnalyticsAggregate>;
    perAgentCounts: Map<string, UsageAnalyticsAggregate>;
    perFolderCounts: Map<number | null, UsageAnalyticsAggregate>;
    callTypeCounts: Map<UsageAnalyticsCall['callType'], UsageAnalyticsAggregate>;
    actorTypeCounts: Map<UsageAnalyticsCall['actorType'], UsageAnalyticsAggregate>;
    perUserCounts: Map<number | null, UsageAnalyticsAggregateWithLastSeen>;
    apiKeyDetails: Map<string, UsageAnalyticsAggregateWithLastSeen>;
    userAgentDetails: Map<string, UsageAnalyticsAggregateWithLastSeen>;
};

/**
 * Max number of detailed rows returned per high-cardinality usage section.
 */
const USAGE_ANALYTICS_DETAIL_LIMIT = 25;

/**
 * Response builders and aggregation helpers for usage analytics.
 *
 * @private function of getUsageAnalyticsResponse
 */
export const UsageAnalyticsAggregation = {
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

    createUsageAnalyticsResponse(options: UsageAnalyticsResponseOptions): UsageAnalyticsResponse {
        const { timeframe, filters, filteredCalls, folderById, agentFolderByName, usernamesById, apiKeyNotes } =
            options;
        const aggregationState = aggregateUsageAnalyticsCalls({
            timeframe,
            filteredCalls,
            agentFolderByName,
        });
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
 * Aggregates all filtered calls into the maps and counters needed for the response.
 */
function aggregateUsageAnalyticsCalls(options: {
    timeframe: UsageAnalyticsTimeframe;
    filteredCalls: readonly UsageAnalyticsCall[];
    agentFolderByName: ReadonlyMap<string, number | null>;
}): UsageAnalyticsAggregationState {
    const aggregationState = createUsageAnalyticsAggregationState(options.timeframe);

    for (const call of options.filteredCalls) {
        const usageValues = createUsageAnalyticsUsageValues(call);
        accumulateUsageSummaryTotals(aggregationState.summaryTotals, usageValues);
        accumulateUsageAnalyticsCall(aggregationState, call, usageValues, options.agentFolderByName);
    }

    return aggregationState;
}

/**
 * Creates empty mutable aggregation state for one timeframe window.
 */
function createUsageAnalyticsAggregationState(timeframe: UsageAnalyticsTimeframe): UsageAnalyticsAggregationState {
    return {
        bucketSizeMs: UsageAnalyticsQuery.resolveTimelineBucketSizeMs(timeframe.from.getTime(), timeframe.to.getTime()),
        summaryTotals: createEmptyUsageAnalyticsSummaryTotals(),
        timelineByBucket: new Map<number, UsageAnalyticsAggregate>(),
        perAgentCounts: new Map<string, UsageAnalyticsAggregate>(),
        perFolderCounts: new Map<number | null, UsageAnalyticsAggregate>(),
        callTypeCounts: new Map<UsageAnalyticsCall['callType'], UsageAnalyticsAggregate>(),
        actorTypeCounts: new Map<UsageAnalyticsCall['actorType'], UsageAnalyticsAggregate>(),
        perUserCounts: new Map<number | null, UsageAnalyticsAggregateWithLastSeen>(),
        apiKeyDetails: new Map<string, UsageAnalyticsAggregateWithLastSeen>(),
        userAgentDetails: new Map<string, UsageAnalyticsAggregateWithLastSeen>(),
    };
}

/**
 * Creates zeroed running totals for the response summary.
 */
function createEmptyUsageAnalyticsSummaryTotals(): UsageAnalyticsSummaryTotals {
    return {
        totalCalls: 0,
        totalTokens: 0,
        totalPriceUsd: 0,
        totalDuration: 0,
        totalHumanDuration: 0,
    };
}

/**
 * Adds one filtered call into the running summary totals.
 */
function accumulateUsageSummaryTotals(
    summaryTotals: UsageAnalyticsSummaryTotals,
    usageValues: UsageAnalyticsUsageValues,
): void {
    summaryTotals.totalCalls += 1;
    summaryTotals.totalTokens += usageValues.tokens;
    summaryTotals.totalPriceUsd += usageValues.priceUsd;
    summaryTotals.totalDuration += usageValues.duration;
    summaryTotals.totalHumanDuration += usageValues.humanDuration;
}

/**
 * Adds one timestamp-valid call into the grouped analytics structures.
 */
function accumulateUsageAnalyticsCall(
    aggregationState: UsageAnalyticsAggregationState,
    call: UsageAnalyticsCall,
    usageValues: UsageAnalyticsUsageValues,
    agentFolderByName: ReadonlyMap<string, number | null>,
): void {
    const timestamp = Date.parse(call.createdAt);
    if (Number.isNaN(timestamp)) {
        return;
    }

    const bucketKey = UsageAnalyticsQuery.floorToBucket(timestamp, aggregationState.bucketSizeMs);
    const folderId = agentFolderByName.get(call.agentName) ?? null;

    addUsageToAggregateMap(aggregationState.timelineByBucket, bucketKey, usageValues);
    addUsageToAggregateMap(aggregationState.perAgentCounts, call.agentName, usageValues);
    addUsageToAggregateMap(aggregationState.perFolderCounts, folderId, usageValues);
    addUsageToAggregateMap(aggregationState.callTypeCounts, call.callType, usageValues);
    addUsageToAggregateMap(aggregationState.actorTypeCounts, call.actorType, usageValues);
    addUsageToAggregateWithLastSeenMap(aggregationState.perUserCounts, call.userId, call.createdAt, usageValues);

    if (call.apiKey) {
        addUsageToAggregateWithLastSeenMap(aggregationState.apiKeyDetails, call.apiKey, call.createdAt, usageValues);
    }

    addUsageToAggregateWithLastSeenMap(aggregationState.userAgentDetails, call.userAgent, call.createdAt, usageValues);
}

/**
 * Extracts additive usage values from one analytics call.
 */
function createUsageAnalyticsUsageValues(call: UsageAnalyticsCall): UsageAnalyticsUsageValues {
    return {
        tokens: call.tokens || 0,
        priceUsd: call.priceUsd || 0,
        duration: call.duration || 0,
        humanDuration: call.humanDuration || 0,
    };
}

/**
 * Adds usage values into one grouped aggregate map.
 */
function addUsageToAggregateMap<TKey>(
    aggregateByKey: Map<TKey, UsageAnalyticsAggregate>,
    key: TKey,
    usageValues: UsageAnalyticsUsageValues,
): void {
    aggregateByKey.set(key, sumUsageAggregate(aggregateByKey.get(key), usageValues));
}

/**
 * Adds usage values into one grouped aggregate map that also tracks the latest timestamp.
 */
function addUsageToAggregateWithLastSeenMap<TKey>(
    aggregateByKey: Map<TKey, UsageAnalyticsAggregateWithLastSeen>,
    key: TKey,
    createdAt: string,
    usageValues: UsageAnalyticsUsageValues,
): void {
    const existingAggregate = aggregateByKey.get(key);

    aggregateByKey.set(key, {
        ...sumUsageAggregate(existingAggregate, usageValues),
        lastSeen: resolveLatestUsageTimestamp(existingAggregate?.lastSeen, createdAt),
    });
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
        ...resolveUsageAggregate(usageAggregate),
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
            calls: usageAggregate.calls,
            tokens: usageAggregate.tokens,
            priceUsd: usageAggregate.priceUsd,
            duration: usageAggregate.duration,
            humanDuration: usageAggregate.humanDuration,
            lastSeen: usageAggregate.lastSeen,
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
        .map(([userAgent, usageAggregate]) => ({
            userAgent,
            calls: usageAggregate.calls,
            tokens: usageAggregate.tokens,
            priceUsd: usageAggregate.priceUsd,
            duration: usageAggregate.duration,
            humanDuration: usageAggregate.humanDuration,
            lastSeen: usageAggregate.lastSeen,
        }))
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
 * Resolves one aggregate or falls back to all-zero values.
 */
function resolveUsageAggregate(usageAggregate: UsageAnalyticsAggregate | undefined): UsageAnalyticsAggregate {
    return usageAggregate || createEmptyUsageAggregate();
}

/**
 * Creates all-zero usage aggregate values.
 */
function createEmptyUsageAggregate(): UsageAnalyticsAggregate {
    return {
        calls: 0,
        tokens: 0,
        priceUsd: 0,
        duration: 0,
        humanDuration: 0,
    };
}

/**
 * Chooses the latest ISO timestamp between the current and candidate values.
 */
function resolveLatestUsageTimestamp(currentLastSeen: string | undefined, candidateLastSeen: string): string {
    return currentLastSeen && currentLastSeen > candidateLastSeen ? currentLastSeen : candidateLastSeen;
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
        const usageAggregate = resolveUsageAggregate(timelineByBucket.get(cursor));
        points.push({
            bucketStart: new Date(cursor).toISOString(),
            calls: usageAggregate.calls,
            tokens: usageAggregate.tokens,
            priceUsd: usageAggregate.priceUsd,
            duration: usageAggregate.duration,
            humanDuration: usageAggregate.humanDuration,
        });
    }

    return points;
}

/**
 * Adds one call into an aggregate usage bucket.
 */
function sumUsageAggregate(
    current: UsageAnalyticsAggregate | undefined,
    usage: UsageAnalyticsUsageValues,
): UsageAnalyticsAggregate {
    return {
        calls: (current?.calls || 0) + 1,
        tokens: (current?.tokens || 0) + usage.tokens,
        priceUsd: (current?.priceUsd || 0) + usage.priceUsd,
        duration: (current?.duration || 0) + usage.duration,
        humanDuration: (current?.humanDuration || 0) + usage.humanDuration,
    };
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
