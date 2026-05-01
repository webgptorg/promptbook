/**
 * Supported chat feedback modes in the Agents Server UI.
 */
export const CHAT_FEEDBACK_MODE_VALUES = ['off', 'stars', 'report_issue'] as const;

/**
 * Supported chat feedback modes in the Agents Server UI.
 */
export type ChatFeedbackMode = (typeof CHAT_FEEDBACK_MODE_VALUES)[number];

/**
 * Shared select options for chat feedback mode pickers.
 */
export const CHAT_FEEDBACK_MODE_OPTIONS: ReadonlyArray<{
    readonly value: ChatFeedbackMode;
    readonly label: string;
}> = [
    {
        value: 'off',
        label: 'Off',
    },
    {
        value: 'stars',
        label: 'Stars',
    },
    {
        value: 'report_issue',
        label: 'Report issue',
    },
] as const;

/**
 * Default feedback mode used when metadata is missing or invalid.
 */
const DEFAULT_CHAT_FEEDBACK_MODE: ChatFeedbackMode = 'stars';

/**
 * Normalizes one raw feedback-mode value from metadata.
 *
 * @param rawValue - Raw metadata value.
 * @returns Normalized mode when recognized, otherwise `null`.
 */
function normalizeChatFeedbackMode(rawValue: string | null | undefined): ChatFeedbackMode | null {
    if (typeof rawValue !== 'string') {
        return null;
    }

    const normalizedValue = rawValue.trim().toLowerCase();

    if (normalizedValue === 'off' || normalizedValue === 'none' || normalizedValue === 'disabled' || normalizedValue === 'false') {
        return 'off';
    }

    if (
        normalizedValue === 'report_issue' ||
        normalizedValue === 'report-issue' ||
        normalizedValue === 'report issue' ||
        normalizedValue === 'issue' ||
        normalizedValue === 'report'
    ) {
        return 'report_issue';
    }

    if (normalizedValue === 'stars' || normalizedValue === 'star' || normalizedValue === 'enabled' || normalizedValue === 'true') {
        return 'stars';
    }

    return null;
}

/**
 * Resolves the effective feedback mode from metadata values.
 *
 * The new `CHAT_FEEDBACK_MODE` metadata takes precedence. When missing, the
 * legacy `IS_FEEDBACK_ENABLED` toggle is used as a fallback.
 *
 * @param rawMode - Raw `CHAT_FEEDBACK_MODE` metadata value.
 * @param rawLegacyIsFeedbackEnabled - Raw legacy `IS_FEEDBACK_ENABLED` metadata value.
 * @returns Effective feedback mode.
 */
export function parseChatFeedbackMode(
    rawMode: string | null | undefined,
    rawLegacyIsFeedbackEnabled: string | null | undefined,
): ChatFeedbackMode {
    const normalizedMode = normalizeChatFeedbackMode(rawMode);
    if (normalizedMode) {
        return normalizedMode;
    }

    if (rawLegacyIsFeedbackEnabled === 'false') {
        return 'off';
    }

    if (rawLegacyIsFeedbackEnabled === 'true') {
        return 'stars';
    }

    return DEFAULT_CHAT_FEEDBACK_MODE;
}

/**
 * Returns whether chat feedback UI and persistence should be enabled.
 *
 * @param feedbackMode - Effective feedback mode.
 * @returns `true` when feedback is enabled.
 */
export function isChatFeedbackEnabled(feedbackMode: ChatFeedbackMode): boolean {
    return feedbackMode !== 'off';
}

/**
 * Maps Agents Server feedback mode to shared chat component feedback mode.
 *
 * @param feedbackMode - Effective feedback mode.
 * @returns Chat component feedback mode.
 */
export function toChatComponentFeedbackMode(feedbackMode: ChatFeedbackMode): 'stars' | 'report_issue' {
    return feedbackMode === 'report_issue' ? 'report_issue' : 'stars';
}
