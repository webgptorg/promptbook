import type {
    UsageAnalyticsAggregationState,
    UsageAnalyticsSummaryTotals,
    UsageAnalyticsUsageValues,
} from './UsageAnalyticsAggregationState';
import { UsageAnalyticsAggregateMath } from './UsageAnalyticsAggregateMath';
import type {
    UsageAnalyticsAggregate,
    UsageAnalyticsAggregateWithLastSeen,
    UsageAnalyticsCall,
    UsageAnalyticsTimeframe,
} from './UsageAnalyticsModel';
import { UsageAnalyticsQuery } from './UsageAnalyticsQuery';

/**
 * Aggregates normalized usage calls into grouped usage state.
 *
 * @private function of UsageAnalyticsAggregation
 */
export const UsageAnalyticsAggregationAccumulator = {
    aggregateUsageAnalyticsCalls(options: {
        timeframe: UsageAnalyticsTimeframe;
        filteredCalls: readonly UsageAnalyticsCall[];
        agentFolderByName: ReadonlyMap<string, number | null>;
    }): UsageAnalyticsAggregationState {
        const aggregationState = createUsageAnalyticsAggregationState(options.timeframe);

        for (const call of options.filteredCalls) {
            const usageValues = UsageAnalyticsAggregateMath.createUsageAnalyticsUsageValues(call);
            accumulateUsageSummaryTotals(aggregationState.summaryTotals, usageValues);
            accumulateUsageAnalyticsCall(aggregationState, call, usageValues, options.agentFolderByName);
        }

        return aggregationState;
    },
};

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

    UsageAnalyticsAggregateMath.addUsageToAggregateMap(aggregationState.timelineByBucket, bucketKey, usageValues);
    UsageAnalyticsAggregateMath.addUsageToAggregateMap(aggregationState.perAgentCounts, call.agentName, usageValues);
    UsageAnalyticsAggregateMath.addUsageToAggregateMap(aggregationState.perFolderCounts, folderId, usageValues);
    UsageAnalyticsAggregateMath.addUsageToAggregateMap(aggregationState.callTypeCounts, call.callType, usageValues);
    UsageAnalyticsAggregateMath.addUsageToAggregateMap(aggregationState.actorTypeCounts, call.actorType, usageValues);
    UsageAnalyticsAggregateMath.addUsageToAggregateWithLastSeenMap(
        aggregationState.perUserCounts,
        call.userId,
        call.createdAt,
        usageValues,
    );

    if (call.apiKey) {
        UsageAnalyticsAggregateMath.addUsageToAggregateWithLastSeenMap(
            aggregationState.apiKeyDetails,
            call.apiKey,
            call.createdAt,
            usageValues,
        );
    }

    UsageAnalyticsAggregateMath.addUsageToAggregateWithLastSeenMap(
        aggregationState.userAgentDetails,
        call.userAgent,
        call.createdAt,
        usageValues,
    );
}
