/**
 * Normalizes optional recurrence interval values in milliseconds.
 *
 * @private function of userChatTimeoutStore
 */
export function normalizeRecurrenceIntervalMs(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    if (value <= 0) {
        return null;
    }

    return Math.max(1, Math.floor(value));
}
