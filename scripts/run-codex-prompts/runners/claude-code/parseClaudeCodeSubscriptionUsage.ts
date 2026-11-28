import type { HarnessSubscriptionUsage, HarnessSubscriptionUsageLimit } from '../types/HarnessSubscriptionUsage';
import { parseClaudeCodeOutputEvents, type ClaudeCodeOutputEvent } from './parseClaudeCodeOutputEvents';

/**
 * Human-readable labels for known Claude Code rolling subscription-limit windows.
 */
const CLAUDE_CODE_RATE_LIMIT_LABELS: Readonly<Record<string, string>> = {
    five_hour: '5h',
    seven_day: '7d',
    seven_day_opus: '7d Opus',
    seven_day_sonnet: '7d Sonnet',
    overage: 'Overage',
};

/**
 * Fallback label used when a newer Claude Code release adds a rate-limit window unknown to Promptbook.
 */
const UNKNOWN_CLAUDE_CODE_RATE_LIMIT_LABEL = 'Limit';

/**
 * Converts Claude Code stream-json rate-limit events into the shared subscription-usage snapshot.
 *
 * Claude Code can emit one event for each applicable limit, so the parser preserves every distinct window instead of
 * assuming the familiar 5-hour and seven-day pair. This lets a new vendor-side limit appear in the dashboard without
 * changing its renderer.
 *
 * @private internal utility of the Claude Code runner
 */
export function parseClaudeCodeSubscriptionUsage(output: string): HarnessSubscriptionUsage | undefined {
    const limitsByType = new Map<string, HarnessSubscriptionUsageLimit>();

    for (const event of parseClaudeCodeOutputEvents(output)) {
        const limit = parseClaudeCodeSubscriptionUsageLimit(event);

        if (limit) {
            limitsByType.set(resolveClaudeCodeRateLimitType(event), limit);
        }
    }

    const limits = [...limitsByType.values()];
    return limits.length === 0 ? undefined : { limits };
}

/**
 * Parses one Claude Code stream event when it contains a usable subscription-limit update.
 *
 * @private helper of `parseClaudeCodeSubscriptionUsage`
 */
function parseClaudeCodeSubscriptionUsageLimit(
    event: ClaudeCodeOutputEvent,
): HarnessSubscriptionUsageLimit | undefined {
    if (event.type !== 'rate_limit_event' || !event.rate_limit_info) {
        return undefined;
    }

    const rateLimitType = resolveClaudeCodeRateLimitType(event);
    const usedPercentage = resolveClaudeCodeUsedPercentage(event.rate_limit_info);

    if (usedPercentage === undefined) {
        return undefined;
    }

    const resetsAt = resolveClaudeCodeResetTimestamp(event.rate_limit_info);

    return {
        label: formatClaudeCodeRateLimitTypeLabel(rateLimitType),
        usedPercentage,
        ...(resetsAt !== undefined && { resetsAt }),
    };
}

/**
 * Formats known and newly introduced Claude Code rate-limit types for a stable terminal label.
 *
 * A newer limit type remains distinct in the dashboard instead of making several unrelated windows all appear as
 * a generic `Limit` row.
 *
 * @private helper of `parseClaudeCodeSubscriptionUsage`
 */
function formatClaudeCodeRateLimitTypeLabel(rateLimitType: string): string {
    const knownLabel = CLAUDE_CODE_RATE_LIMIT_LABELS[rateLimitType];

    if (knownLabel) {
        return knownLabel;
    }

    const words = rateLimitType.split(/[\s_-]+/u).filter(Boolean);

    if (words.length === 0) {
        return UNKNOWN_CLAUDE_CODE_RATE_LIMIT_LABEL;
    }

    return words.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join(' ');
}

/**
 * Resolves the stable rate-limit type key emitted by Claude Code across camel- and snake-case payload versions.
 *
 * @private helper of `parseClaudeCodeSubscriptionUsage`
 */
function resolveClaudeCodeRateLimitType(event: ClaudeCodeOutputEvent): string {
    const rateLimitInfo = event.rate_limit_info;
    const rateLimitType = rateLimitInfo?.rateLimitType ?? rateLimitInfo?.rate_limit_type;

    return typeof rateLimitType === 'string' && rateLimitType.trim() !== ''
        ? rateLimitType.trim()
        : UNKNOWN_CLAUDE_CODE_RATE_LIMIT_LABEL;
}

/**
 * Converts Claude's fractional utilization value to a displayed percentage.
 *
 * A rejected limit event may omit utilization, but it still conveys a precise zero-remaining state and is therefore
 * rendered as 100 percent consumed.
 *
 * @private helper of `parseClaudeCodeSubscriptionUsage`
 */
function resolveClaudeCodeUsedPercentage(
    rateLimitInfo: NonNullable<ClaudeCodeOutputEvent['rate_limit_info']>,
): number | undefined {
    const utilization = rateLimitInfo.utilization;

    if (typeof utilization === 'number' && Number.isFinite(utilization)) {
        const usedPercentage = utilization <= 1 ? utilization * 100 : utilization;

        if (usedPercentage >= 0 && usedPercentage <= 100) {
            return usedPercentage;
        }
    }

    return rateLimitInfo.status === 'rejected' ? 100 : undefined;
}

/**
 * Reads Claude's optional Unix reset timestamp from either current or earlier stream payload naming.
 *
 * @private helper of `parseClaudeCodeSubscriptionUsage`
 */
function resolveClaudeCodeResetTimestamp(
    rateLimitInfo: NonNullable<ClaudeCodeOutputEvent['rate_limit_info']>,
): number | undefined {
    const resetsAt = rateLimitInfo.resetsAt ?? rateLimitInfo.resets_at;

    return typeof resetsAt === 'number' && Number.isFinite(resetsAt) && resetsAt > 0 ? resetsAt : undefined;
}
