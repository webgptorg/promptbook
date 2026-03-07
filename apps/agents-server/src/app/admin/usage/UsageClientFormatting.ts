import type {
    UsageActorType,
    UsageAnalyticsResponse,
    UsageCallType,
    UsageMetricMode,
} from '@/src/utils/usageAdmin';

/**
 * Source shape with metric values used across usage widgets.
 */
type UsageClientMetricValueSource = {
    priceUsd: number;
    duration: number;
    humanDuration: number;
};

/**
 * Currency formatter used by usage metric formatting.
 */
const usageCurrencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Compact number formatter used by tables and summary cards.
 */
const usageCompactFormatter = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Shared formatting and value-resolution helpers for `<UsageClient/>`.
 * @private function of UsageClient
 */
export const UsageClientFormatting = {
    resolveMetricValue(source: UsageClientMetricValueSource, metric: UsageMetricMode): number {
        if (metric === 'AGENT_DURATION') {
            return source.duration;
        }
        if (metric === 'HUMAN_DURATION') {
            return source.humanDuration;
        }
        return source.priceUsd;
    },

    resolveSummaryMetricValue(summary: UsageAnalyticsResponse['summary'], metric: UsageMetricMode): number {
        if (metric === 'AGENT_DURATION') {
            return summary.totalDuration;
        }
        if (metric === 'HUMAN_DURATION') {
            return summary.totalHumanDuration;
        }
        return summary.totalPriceUsd;
    },

    usageMetricLabel(metric: UsageMetricMode): string {
        if (metric === 'AGENT_DURATION') {
            return 'Agent duration';
        }
        if (metric === 'HUMAN_DURATION') {
            return 'Estimated human time';
        }
        return 'Cost';
    },

    usageMetricDescription(metric: UsageMetricMode): string {
        if (metric === 'AGENT_DURATION') {
            return 'How long the prompts were running';
        }
        if (metric === 'HUMAN_DURATION') {
            return 'How long a human would likely need to do the same work';
        }
        return 'Estimated spend in USD';
    },

    formatUsageMetricValue(metric: UsageMetricMode, value: number): string {
        if (metric === 'AGENT_DURATION') {
            return `${usageCompactFormatter.format(value)}s`;
        }
        if (metric === 'HUMAN_DURATION') {
            if (value < 1 / 60) {
                return `${usageCompactFormatter.format(value * 3600)}s`;
            }
            if (value < 1) {
                return `${usageCompactFormatter.format(value * 60)}m`;
            }
            return `${usageCompactFormatter.format(value)}h`;
        }
        return usageCurrencyFormatter.format(value);
    },

    formatCompactNumber(value: number): string {
        return usageCompactFormatter.format(value);
    },

    formatDateTime(iso: string): string {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
            return iso;
        }
        return date.toLocaleString();
    },

    formatShortDate(iso: string): string {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
            return iso;
        }
        return date.toLocaleDateString();
    },

    isIsoDateInputValue(value: string): boolean {
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
    },

    truncateMiddle(value: string, head: number, tail: number): string {
        if (value.length <= head + tail + 3) {
            return value;
        }
        return `${value.slice(0, head)}...${value.slice(-tail)}`;
    },

    formatUsageUserLabel(username: string): string {
        if (username.startsWith('anonymous-')) {
            return `Anonymous (${UsageClientFormatting.truncateMiddle(username, 10, 6)})`;
        }

        return username;
    },

    callTypeColorClass(callType: UsageCallType): string {
        if (callType === 'VOICE_CHAT') {
            return 'bg-gradient-to-r from-teal-500 to-emerald-500';
        }
        if (callType === 'COMPATIBLE_API') {
            return 'bg-gradient-to-r from-indigo-500 to-blue-600';
        }
        return 'bg-gradient-to-r from-sky-500 to-cyan-500';
    },

    actorTypeColorClass(actorType: UsageActorType): string {
        if (actorType === 'TEAM_MEMBER') {
            return 'bg-gradient-to-r from-amber-500 to-orange-500';
        }
        if (actorType === 'API_KEY') {
            return 'bg-gradient-to-r from-fuchsia-500 to-pink-500';
        }
        return 'bg-gradient-to-r from-slate-500 to-slate-700';
    },
};
