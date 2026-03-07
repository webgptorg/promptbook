import { UsageAnalyticsResponse } from '@/src/utils/usageAdmin';
import type { UsageAggregate } from '../UsageAggregate';

/**
 * @private Helpers that build the usage timeline for analytics.
 */
export const UsageTimeline = {
    createTimelineSeries,
    resolveTimelineBucketSizeMs,
    floorToBucket,
} as const;

/**
 * @private Builds a series of zero-filled buckets between the selected timestamps.
 */
function createTimelineSeries(options: {
    from: number;
    to: number;
    bucketSizeMs: number;
    timelineByBucket: Map<number, UsageAggregate>;
}): UsageAnalyticsResponse['timeline'] {
    const { from, to, bucketSizeMs, timelineByBucket } = options;
    if (to < from) {
        return [];
    }

    const points: UsageAnalyticsResponse['timeline'] = [];
    const start = floorToBucket(from, bucketSizeMs);
    const end = floorToBucket(to, bucketSizeMs);

    for (let cursor = start; cursor <= end; cursor += bucketSizeMs) {
        const bucketVal = timelineByBucket.get(cursor);
        points.push({
            bucketStart: new Date(cursor).toISOString(),
            calls: bucketVal?.calls || 0,
            tokens: bucketVal?.tokens || 0,
            priceUsd: bucketVal?.priceUsd || 0,
            duration: bucketVal?.duration || 0,
            humanDuration: bucketVal?.humanDuration || 0,
        });
    }

    return points;
}

/**
 * @private Picks a bucket size that fits the requested span without overwhelming data.
 */
function resolveTimelineBucketSizeMs(from: number, to: number): number {
    const spanMs = Math.max(0, to - from);
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;

    if (spanMs <= 2 * dayMs) {
        return hourMs;
    }
    if (spanMs <= 14 * dayMs) {
        return 6 * hourMs;
    }
    return dayMs;
}

/**
 * @private Floors the timestamp down to the start of the bucket so the timeline stays aligned.
 */
function floorToBucket(timestamp: number, bucketSizeMs: number): number {
    return Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
}
