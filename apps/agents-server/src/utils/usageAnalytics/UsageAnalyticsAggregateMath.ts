import type { UsageAnalyticsUsageValues } from './UsageAnalyticsAggregationState';
import type {
    UsageAnalyticsAggregate,
    UsageAnalyticsAggregateWithLastSeen,
    UsageAnalyticsCall,
} from './UsageAnalyticsModel';

/**
 * Shared usage aggregate math and map helpers.
 *
 * @private function of UsageAnalyticsAggregation
 */
export const UsageAnalyticsAggregateMath = {
    createUsageAnalyticsUsageValues(call: UsageAnalyticsCall): UsageAnalyticsUsageValues {
        return {
            tokens: call.tokens || 0,
            priceUsd: call.priceUsd || 0,
            duration: call.duration || 0,
            humanDuration: call.humanDuration || 0,
        };
    },

    addUsageToAggregateMap<TKey>(
        aggregateByKey: Map<TKey, UsageAnalyticsAggregate>,
        key: TKey,
        usageValues: UsageAnalyticsUsageValues,
    ): void {
        aggregateByKey.set(key, sumUsageAggregate(aggregateByKey.get(key), usageValues));
    },

    addUsageToAggregateWithLastSeenMap<TKey>(
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
    },

    resolveUsageAggregate(usageAggregate: UsageAnalyticsAggregate | undefined): UsageAnalyticsAggregate {
        return usageAggregate || createEmptyUsageAggregate();
    },
};

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
 * Adds one call into an aggregate usage bucket.
 */
function sumUsageAggregate(
    current: UsageAnalyticsAggregate | UsageAnalyticsAggregateWithLastSeen | undefined,
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
