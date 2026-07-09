import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { formatUnknownErrorDetails } from '../../common/formatUnknownErrorDetails';
import { formatDurationMs } from '../../common/parseDuration';
import { parseClaudeCodeOutputEvents, type ClaudeCodeOutputEvent } from './parseClaudeCodeOutputEvents';

/**
 * Number of milliseconds added after Claude's reported reset timestamp before retrying.
 */
export const CLAUDE_CODE_SESSION_LIMIT_RESET_BUFFER_MS = 30 * 1000;

/**
 * Fallback delay used when Claude reports a session limit without a machine-readable reset timestamp.
 */
export const DEFAULT_CLAUDE_CODE_SESSION_LIMIT_RETRY_DELAY_MS = 10 * 60 * 1000;

/**
 * Session-limit detection details needed to resume a Claude Code run.
 */
export type ClaudeCodeSessionLimit = {
    readonly sessionId: string;
    readonly resetDate?: Date;
    readonly rateLimitType?: string;
    readonly summary: string;
};

/**
 * Extracts a Claude Code session-limit failure from a thrown runner error.
 */
export function extractClaudeCodeSessionLimitFromError(error: unknown): ClaudeCodeSessionLimit | undefined {
    return extractClaudeCodeSessionLimitFromOutput(formatUnknownErrorDetails(error));
}

/**
 * Extracts a Claude Code session-limit failure from raw stream-json output.
 */
export function extractClaudeCodeSessionLimitFromOutput(output: string): ClaudeCodeSessionLimit | undefined {
    const events = parseClaudeCodeOutputEvents(output);
    const rejectedRateLimitEvent = events.find(isRejectedRateLimitEvent);
    const sessionLimitResultEvent = events.find(isSessionLimitResultEvent);
    const sessionLimitTextEvent = events.find(isSessionLimitTextEvent);

    if (!sessionLimitResultEvent && !sessionLimitTextEvent) {
        return undefined;
    }

    const sessionId = findClaudeCodeSessionId(events);

    if (!sessionId) {
        return undefined;
    }

    const resetDate = extractResetDate(rejectedRateLimitEvent);
    const rateLimitType =
        rejectedRateLimitEvent?.rate_limit_info?.rateLimitType ?? sessionLimitResultEvent?.rate_limit_info?.rateLimitType;
    const summary =
        extractSessionLimitSummary(sessionLimitResultEvent) ??
        extractSessionLimitSummary(sessionLimitTextEvent) ??
        'Claude Code reported a session limit.';

    return {
        sessionId,
        resetDate,
        rateLimitType,
        summary,
    };
}

/**
 * Computes how long to wait before trying to resume the Claude Code session.
 */
export function getClaudeCodeSessionLimitDelayMs(
    sessionLimit: ClaudeCodeSessionLimit,
    nowMs = Date.now(),
): number {
    if (!sessionLimit.resetDate) {
        return DEFAULT_CLAUDE_CODE_SESSION_LIMIT_RETRY_DELAY_MS;
    }

    return Math.max(0, sessionLimit.resetDate.getTime() - nowMs + CLAUDE_CODE_SESSION_LIMIT_RESET_BUFFER_MS);
}

/**
 * Builds the follow-up prompt sent into a resumed Claude Code session after its limit resets.
 */
export function buildClaudeCodeSessionResurrectionPrompt(originalPrompt: string, sessionId: string): string {
    return spaceTrim(
        (block) => `
            ## Claude Code session resurrection

            You are resuming Claude Code session \`${sessionId}\` after Claude reported a session limit.
            Continue the same task from the existing repository and session state.
            Do not discard useful context, completed analysis, or file changes from the resumed session.

            The original prompt is repeated below as reference in case the resumed session needs it.

            ## Original prompt

            ${block(originalPrompt)}
        `,
    );
}

/**
 * Builds a compact one-line label for logs and terminal UI messages.
 */
export function formatClaudeCodeSessionLimitForDisplay(sessionLimit: ClaudeCodeSessionLimit): string {
    const resetSuffix = sessionLimit.resetDate
        ? `, resets at ${sessionLimit.resetDate.toISOString()}`
        : `, retrying every ${formatDurationMs(DEFAULT_CLAUDE_CODE_SESSION_LIMIT_RETRY_DELAY_MS)}`;
    const rateLimitSuffix = sessionLimit.rateLimitType ? ` (${sessionLimit.rateLimitType})` : '';

    return `${sessionLimit.summary}${rateLimitSuffix}${resetSuffix}`;
}

/**
 * Returns true when the event is an explicit rejected Claude Code rate-limit event.
 */
function isRejectedRateLimitEvent(event: ClaudeCodeOutputEvent): boolean {
    return event.type === 'rate_limit_event' && event.rate_limit_info?.status === 'rejected';
}

/**
 * Returns true when the final result reports the Claude session limit.
 */
function isSessionLimitResultEvent(event: ClaudeCodeOutputEvent): boolean {
    return (
        event.type === 'result' &&
        event.is_error === true &&
        event.api_error_status === 429 &&
        isSessionLimitText(event.result)
    );
}

/**
 * Returns true when any assistant event reports the Claude session limit in text.
 */
function isSessionLimitTextEvent(event: ClaudeCodeOutputEvent): boolean {
    if (event.error !== 'rate_limit') {
        return false;
    }

    return isSessionLimitText(extractSessionLimitSummary(event));
}

/**
 * Extracts the first session id reported by Claude Code.
 */
function findClaudeCodeSessionId(events: readonly ClaudeCodeOutputEvent[]): string | undefined {
    return events.map((event) => event.session_id).find((sessionId): sessionId is string => Boolean(sessionId));
}

/**
 * Extracts Claude's reset timestamp from a rejected rate-limit event.
 */
function extractResetDate(event: ClaudeCodeOutputEvent | undefined): Date | undefined {
    const resetsAt = event?.rate_limit_info?.resetsAt;

    if (typeof resetsAt !== 'number' || !Number.isFinite(resetsAt)) {
        return undefined;
    }

    const resetDate = new Date(resetsAt * 1000);

    if (Number.isNaN(resetDate.getTime())) {
        return undefined;
    }

    return resetDate;
}

/**
 * Extracts a human-readable session-limit summary from an event.
 */
function extractSessionLimitSummary(event: ClaudeCodeOutputEvent | undefined): string | undefined {
    if (!event) {
        return undefined;
    }

    if (typeof event.result === 'string' && event.result.trim()) {
        return event.result.trim();
    }

    const textContent = event.message?.content
        ?.map((content) => (content.type === 'text' ? content.text?.trim() : undefined))
        .find((text): text is string => Boolean(text));

    return textContent;
}

/**
 * Checks whether a text value names the Claude Code session limit.
 */
function isSessionLimitText(text: string | undefined): boolean {
    return /\bsession\s+limit\b/iu.test(text ?? '');
}
