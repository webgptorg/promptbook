import moment from 'moment';
import type { PromptStats } from '../prompts/types/PromptStats';
import { ESTIMATED_DONE_CALENDAR_FORMATS, formatDurationBrief } from './progressFormatting';

/**
 * Shared progress metrics used by both coder-run terminal UIs.
 */
export type CoderRunProgressSnapshot = {
    readonly totalPrompts: number;
    readonly sessionDone: number;
    readonly sessionRemaining: number;
    readonly sessionTotal: number;
    readonly currentPromptIndex: number;
    readonly skippedPrompts: number;
    readonly toBeWrittenPrompts: number;
    readonly percentage: number;
    readonly elapsedText: string;
    readonly estimatedTotalText: string;
    readonly estimatedLabel: string;
    readonly isEstimatedTotalKnown: boolean;
};

/**
 * Builds a session-scoped progress snapshot from prompt stats and elapsed active time.
 *
 * When the current session has not finished any prompt yet but a `cachedAveragePromptDurationMs` is
 * provided (loaded from the per-config estimate cache stored in the temp folder), the snapshot uses
 * that historical average to project the remaining work instead of waiting for the first completion.
 */
export function buildCoderRunProgressSnapshot(
    stats: PromptStats,
    elapsedDuration: moment.Duration,
    initialDone: number,
    cachedAveragePromptDurationMs?: number,
    runLimit?: number,
): CoderRunProgressSnapshot {
    const totalPrompts = stats.done + stats.forAgent + stats.toBeWritten;
    const completedSessionPrompts = Math.max(0, stats.done - initialDone);
    const availableSessionTotal = completedSessionPrompts + stats.forAgent;
    const sessionTotal = resolveSessionTotal(availableSessionTotal, runLimit);
    const sessionDone = Math.min(completedSessionPrompts, sessionTotal);
    const sessionRemaining = Math.max(0, sessionTotal - sessionDone);
    const currentPromptIndex = sessionTotal > 0 ? Math.min(sessionDone + 1, sessionTotal) : 0;
    const percentage = sessionTotal > 0 ? Math.round((sessionDone / sessionTotal) * 100) : 0;
    const elapsedText = formatDurationBrief(elapsedDuration);
    const elapsedMs = elapsedDuration.asMilliseconds();

    let estimatedTotalText = 'estimating...';
    let estimatedLabel = 'after first completion';
    let isEstimatedTotalKnown = false;
    let estimatedTotalMs: number | undefined;

    if (sessionTotal > 0 && sessionDone > 0) {
        estimatedTotalMs = (elapsedMs * sessionTotal) / sessionDone;
    } else if (
        sessionTotal > 0 &&
        cachedAveragePromptDurationMs !== undefined &&
        cachedAveragePromptDurationMs > 0
    ) {
        const projectedRemainingMs = sessionRemaining * cachedAveragePromptDurationMs;
        estimatedTotalMs = elapsedMs + projectedRemainingMs;
    }

    if (estimatedTotalMs !== undefined) {
        const estimatedRemainingMs = Math.max(0, estimatedTotalMs - elapsedMs);
        const estimatedTotalDuration = moment.duration(estimatedTotalMs);
        const estimatedCompletion = moment().add(estimatedRemainingMs, 'milliseconds');

        estimatedTotalText = formatDurationBrief(estimatedTotalDuration);
        estimatedLabel = estimatedCompletion.calendar(null, ESTIMATED_DONE_CALENDAR_FORMATS);
        isEstimatedTotalKnown = true;
    }

    return {
        totalPrompts,
        sessionDone,
        sessionRemaining,
        sessionTotal,
        currentPromptIndex,
        skippedPrompts: stats.belowMinimumPriority,
        toBeWrittenPrompts: stats.toBeWritten,
        percentage,
        elapsedText,
        estimatedTotalText,
        estimatedLabel,
        isEstimatedTotalKnown,
    };
}

/**
 * Resolves the number of prompt runs represented by the current session progress.
 */
function resolveSessionTotal(availableSessionTotal: number, runLimit: number | undefined): number {
    if (runLimit === undefined) {
        return availableSessionTotal;
    }

    return Math.min(availableSessionTotal, runLimit);
}
