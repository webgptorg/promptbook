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
 */
export function buildCoderRunProgressSnapshot(
    stats: PromptStats,
    elapsedDuration: moment.Duration,
    initialDone: number,
): CoderRunProgressSnapshot {
    const totalPrompts = stats.done + stats.forAgent + stats.toBeWritten;
    const sessionDone = Math.max(0, stats.done - initialDone);
    const sessionRemaining = stats.forAgent;
    const sessionTotal = sessionDone + sessionRemaining;
    const currentPromptIndex = sessionTotal > 0 ? Math.min(sessionDone + 1, sessionTotal) : 0;
    const percentage = sessionTotal > 0 ? Math.round((sessionDone / sessionTotal) * 100) : 0;
    const elapsedText = formatDurationBrief(elapsedDuration);

    let estimatedTotalText = 'estimating...';
    let estimatedLabel = 'after first completion';
    let isEstimatedTotalKnown = false;

    if (sessionTotal > 0 && sessionDone > 0) {
        const estimatedTotalMs = (elapsedDuration.asMilliseconds() * sessionTotal) / sessionDone;
        const estimatedRemainingMs = Math.max(0, estimatedTotalMs - elapsedDuration.asMilliseconds());
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
