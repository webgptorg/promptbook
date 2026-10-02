/**
 * One rolling subscription limit reported by a coding harness.
 *
 * @private internal type of `ptbk coder`
 */
export type HarnessSubscriptionUsageLimit = {
    /**
     * Short, user-facing name of the limit window, for example `5h` or `7d`.
     */
    readonly label: string;

    /**
     * Percentage of this limit which has already been consumed, from 0 through 100.
     */
    readonly usedPercentage: number;

    /**
     * Unix timestamp in seconds at which this limit window resets, when reported by the harness.
     */
    readonly resetsAt?: number;
};

/**
 * Subscription usage snapshot which a coding harness can optionally report.
 *
 * The runner contract deliberately keeps this independent from per-prompt token usage: subscription limits can be
 * shared with other tools and can contain several rolling windows.
 *
 * @private internal type of `ptbk coder`
 */
export type HarnessSubscriptionUsage = {
    /**
     * Every subscription limit currently reported by the harness, in display order.
     */
    readonly limits: ReadonlyArray<HarnessSubscriptionUsageLimit>;
};

/**
 * Merges a newly reported subset of subscription windows into the latest complete snapshot.
 *
 * Some harnesses emit an update only for the limit whose state changed. Keeping the previous windows means a
 * five-hour update cannot make a still-valid weekly limit disappear from the dashboard. Existing order is preserved
 * and newly discovered windows are appended, which keeps the terminal presentation stable between refreshes.
 *
 * @private internal utility of `ptbk coder`
 */
export function mergeHarnessSubscriptionUsage(
    previousSubscriptionUsage: HarnessSubscriptionUsage | undefined,
    latestSubscriptionUsage: HarnessSubscriptionUsage,
): HarnessSubscriptionUsage {
    if (previousSubscriptionUsage === undefined) {
        return latestSubscriptionUsage;
    }

    const latestLimitsByLabel = new Map(
        latestSubscriptionUsage.limits.map((latestLimit) => [latestLimit.label, latestLimit]),
    );
    const previousLimitLabels = new Set(previousSubscriptionUsage.limits.map((previousLimit) => previousLimit.label));

    return {
        limits: [
            ...previousSubscriptionUsage.limits.map(
                (previousLimit) => latestLimitsByLabel.get(previousLimit.label) ?? previousLimit,
            ),
            ...latestSubscriptionUsage.limits.filter((latestLimit) => !previousLimitLabels.has(latestLimit.label)),
        ],
    };
}
