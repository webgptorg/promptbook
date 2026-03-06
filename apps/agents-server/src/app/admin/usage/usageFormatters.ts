import type {
    UsageAnalyticsResponse,
    UsageActorType,
    UsageCallType,
    UsageMetricMode,
} from '@/src/utils/usageAdmin';

/**
 * Source shape with metric values used across usage widgets.
 */
type UsageMetricValueSource = {
    priceUsd: number;
    duration: number;
    humanDuration: number;
};

/**
 * Formats numeric values for compact summary visuals.
 */
export function formatCompactNumber(value: number): string {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/**
 * Formats duration value measured in seconds.
 */
export function formatDurationSeconds(seconds: number): string {
    return `${formatCompactNumber(seconds)}s`;
}

/**
 * Formats estimated human duration measured in hours.
 */
export function formatHumanDurationHours(hours: number): string {
    if (hours < 1 / 60) {
        return `${formatCompactNumber(hours * 3600)}s`;
    }
    if (hours < 1) {
        return `${formatCompactNumber(hours * 60)}m`;
    }
    return `${formatCompactNumber(hours)}h`;
}

/**
 * Resolves one metric value from any usage row.
 */
export function resolveMetricValue(source: UsageMetricValueSource, metric: UsageMetricMode): number {
    if (metric === 'AGENT_DURATION') {
        return source.duration;
    }
    if (metric === 'HUMAN_DURATION') {
        return source.humanDuration;
    }
    return source.priceUsd;
}

/**
 * Resolves one metric value from the summary payload.
 */
export function resolveSummaryMetricValue(
    summary: UsageAnalyticsResponse['summary'],
    metric: UsageMetricMode,
): number {
    if (metric === 'AGENT_DURATION') {
        return summary.totalDuration;
    }
    if (metric === 'HUMAN_DURATION') {
        return summary.totalHumanDuration;
    }
    return summary.totalPriceUsd;
}

/**
 * Human label for one selectable usage metric.
 */
export function usageMetricLabel(metric: UsageMetricMode): string {
    if (metric === 'AGENT_DURATION') {
        return 'Agent duration';
    }
    if (metric === 'HUMAN_DURATION') {
        return 'Estimated human time';
    }
    return 'Cost';
}

/**
 * Supporting description for one selectable usage metric.
 */
export function usageMetricDescription(metric: UsageMetricMode): string {
    if (metric === 'AGENT_DURATION') {
        return 'How long the prompts were running';
    }
    if (metric === 'HUMAN_DURATION') {
        return 'How long a human would likely need to do the same work';
    }
    return 'Estimated spend in USD';
}

/**
 * Formats one metric value for cards, tables, and charts.
 */
export function formatUsageMetricValue(metric: UsageMetricMode, value: number): string {
    if (metric === 'AGENT_DURATION') {
        return formatDurationSeconds(value);
    }
    if (metric === 'HUMAN_DURATION') {
        return formatHumanDurationHours(value);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/**
 * Formats ISO datetime for readable tables.
 */
export function formatDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleString();
}

/**
 * Formats date labels for timeline axis.
 */
export function formatShortDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleDateString();
}

/**
 * Truncates long labels while preserving start and end segments.
 */
export function truncateMiddle(value: string, head: number, tail: number): string {
    if (value.length <= head + tail + 3) {
        return value;
    }
    return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

/**
 * Formats user labels in usage tables and shortens anonymous usernames.
 */
export function formatUsageUserLabel(username: string): string {
    if (username.startsWith('anonymous-')) {
        return `Anonymous (${truncateMiddle(username, 10, 6)})`;
    }
    return username;
}

/**
 * Tailwind color class for call-type bars.
 */
export function callTypeColorClass(callType: UsageCallType): string {
    if (callType === 'VOICE_CHAT') {
        return 'bg-gradient-to-r from-teal-500 to-emerald-500';
    }
    if (callType === 'COMPATIBLE_API') {
        return 'bg-gradient-to-r from-indigo-500 to-blue-600';
    }
    return 'bg-gradient-to-r from-sky-500 to-cyan-500';
}

/**
 * Tailwind color class for actor-type bars.
 */
export function actorTypeColorClass(actorType: UsageActorType): string {
    if (actorType === 'TEAM_MEMBER') {
        return 'bg-gradient-to-r from-amber-500 to-orange-500';
    }
    if (actorType === 'API_KEY') {
        return 'bg-gradient-to-r from-fuchsia-500 to-pink-500';
    }
    return 'bg-gradient-to-r from-slate-500 to-slate-700';
}
