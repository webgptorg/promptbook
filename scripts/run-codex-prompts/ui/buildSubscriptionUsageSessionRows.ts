import colors from 'colors';
import { formatDurationMs } from '../common/parseDuration';
import type { HarnessSubscriptionUsage } from '../runners/types/HarnessSubscriptionUsage';
import type { SessionRow } from './buildRunUiFrameShared';

/**
 * Label shown on the first subscription-usage row in the terminal Session box.
 */
const SUBSCRIPTION_USAGE_SESSION_LABEL = 'Usage';

/**
 * Number of milliseconds in one calendar-free day used for compact reset countdowns.
 */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Builds every available subscription-limit row for the terminal Session box.
 *
 * The first row carries the `Usage` label and subsequent rows stay aligned beneath it, allowing a harness to report
 * any number of windows instead of making the dashboard assume a fixed 5-hour/weekly pair.
 *
 * @private internal utility of coder run UI
 */
export function buildSubscriptionUsageSessionRows(
    subscriptionUsage: HarnessSubscriptionUsage | undefined,
    currentTimeMs = Date.now(),
): readonly SessionRow[] {
    if (!subscriptionUsage || subscriptionUsage.limits.length === 0) {
        return [];
    }

    return subscriptionUsage.limits.map((limit, index) => ({
        label: index === 0 ? SUBSCRIPTION_USAGE_SESSION_LABEL : '',
        value: formatSubscriptionUsageLimit(limit, currentTimeMs),
    }));
}

/**
 * Formats one remaining subscription limit and its optional reset time for the terminal dashboard.
 *
 * @private helper of `buildSubscriptionUsageSessionRows`
 */
function formatSubscriptionUsageLimit(
    limit: HarnessSubscriptionUsage['limits'][number],
    currentTimeMs: number,
): string {
    const remainingPercentage = Math.round(Math.max(0, Math.min(100, 100 - limit.usedPercentage)));
    const remainingPercentageColor = resolveRemainingPercentageColor(remainingPercentage);
    const resetText = formatSubscriptionUsageReset(limit.resetsAt, currentTimeMs);
    const label = limit.label.trim() || SUBSCRIPTION_USAGE_SESSION_LABEL;

    return [
        colors.bold(label),
        remainingPercentageColor(`${remainingPercentage}% remaining`),
        ...(resetText ? [colors.gray(resetText)] : []),
    ].join('  ·  ');
}

/**
 * Chooses an attention color for the remaining subscription percentage.
 *
 * @private helper of `buildSubscriptionUsageSessionRows`
 */
function resolveRemainingPercentageColor(remainingPercentage: number): (text: string) => string {
    if (remainingPercentage === 0) {
        return colors.red;
    }

    if (remainingPercentage <= 20) {
        return colors.yellow;
    }

    return colors.green;
}

/**
 * Formats the optional future reset timestamp of one subscription limit.
 *
 * @private helper of `buildSubscriptionUsageSessionRows`
 */
function formatSubscriptionUsageReset(resetsAt: number | undefined, currentTimeMs: number): string | undefined {
    if (resetsAt === undefined) {
        return undefined;
    }

    const remainingDurationMs = resetsAt * 1000 - currentTimeMs;

    if (remainingDurationMs <= 0) {
        return 'resets now';
    }

    return `resets in ${formatSubscriptionUsageDuration(remainingDurationMs)}`;
}

/**
 * Formats a reset countdown with days when a weekly-style limit is still several days away.
 *
 * @private helper of `buildSubscriptionUsageSessionRows`
 */
function formatSubscriptionUsageDuration(durationMs: number): string {
    const dayCount = Math.floor(durationMs / ONE_DAY_MS);

    if (dayCount === 0) {
        return formatDurationMs(durationMs);
    }

    const remainingDurationMs = durationMs - dayCount * ONE_DAY_MS;

    return remainingDurationMs === 0 ? `${dayCount}d` : `${dayCount}d ${formatDurationMs(remainingDurationMs)}`;
}
