/**
 * Normalizes one stored or untrusted total run count.
 *
 * @param value - Raw run-count limit.
 * @returns Whole positive limit, or `null` when the planned message repeats without a count limit.
 *
 * @private function of `plannedMessageSchedule`
 */
export function normalizePlannedMessageMaxRunCount(value: unknown): number | null {
    const maxRunCount = Number(value);

    if (!Number.isFinite(maxRunCount) || maxRunCount < 1) {
        return null;
    }

    return Math.floor(maxRunCount);
}

/**
 * Normalizes one stored or untrusted schedule boundary into an ISO timestamp.
 *
 * @param value - Raw date value.
 * @returns ISO timestamp, or `null` when the value is not a usable date.
 *
 * @private function of `plannedMessageSchedule`
 */
export function normalizePlannedMessageDateIso(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

/**
 * Normalizes one stored or untrusted cron expression without validating its fields.
 *
 * Stored expressions were already validated when they were planned, and mapping one database row must
 * never throw, so the field syntax is checked only where a new schedule is accepted.
 *
 * @param value - Raw cron expression.
 * @returns Trimmed expression, or `null` when there is none.
 *
 * @private function of `plannedMessageSchedule`
 */
export function normalizePlannedMessageCronExpression(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    return value.trim() || null;
}
