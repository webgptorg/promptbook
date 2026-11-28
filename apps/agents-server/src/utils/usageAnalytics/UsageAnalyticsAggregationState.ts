import type { UsageAnalyticsResponse } from '../usageAdmin';
import type {
    UsageAnalyticsAggregate,
    UsageAnalyticsAggregateWithLastSeen,
    UsageAnalyticsCall,
} from './UsageAnalyticsModel';

/**
 * Per-call usage values accumulated across grouped usage buckets.
 *
 * @private function of UsageAnalyticsAggregation
 */
export type UsageAnalyticsUsageValues = Omit<UsageAnalyticsAggregate, 'calls'>;

/**
 * Rolling summary totals accumulated across all filtered calls.
 *
 * @private function of UsageAnalyticsAggregation
 */
export type UsageAnalyticsSummaryTotals = Pick<
    UsageAnalyticsResponse['summary'],
    'totalCalls' | 'totalTokens' | 'totalPriceUsd' | 'totalDuration' | 'totalHumanDuration'
>;

/**
 * Mutable state built while aggregating usage analytics calls.
 *
 * @private function of UsageAnalyticsAggregation
 */
export type UsageAnalyticsAggregationState = {
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
