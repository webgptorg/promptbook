import type { UsageAggregate } from './UsageAggregate';

/**
 * @private Aggregated usage metrics that also track the last seen timestamp for a user or key.
 */
export type UsageAggregateWithLastSeen = UsageAggregate & {
    lastSeen: string;
};
