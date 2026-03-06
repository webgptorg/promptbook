/**
 * @private Helpers for normalizing optional strings coming from queries and rows.
 */
export const UsageNormalization = {
    normalizeOptionalText,
    normalizeUserAgent,
} as const;

/**
 * @private Trims text and returns `null` when the input is missing or empty.
 */
function normalizeOptionalText(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/**
 * @private Normalizes raw user-agent strings for grouping.
 */
function normalizeUserAgent(value: string | null): string {
    const normalized = normalizeOptionalText(value);
    return normalized || '(unknown user agent)';
}
