/**
 * @private Aggregated usage metrics tracked for buckets or groups.
 */
export type UsageAggregate = {
    calls: number;
    tokens: number;
    priceUsd: number;
    duration: number;
    humanDuration: number;
};
