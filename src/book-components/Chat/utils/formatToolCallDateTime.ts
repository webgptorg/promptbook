/**
 * Locale-aware date/time labels derived from one tool-call timestamp.
 *
 * @private utility of `<Chat/>`
 */
type ToolCallDateTimeLabels = {
    /**
     * Primary local time label shown in chips and clock panels.
     */
    readonly localTimeLabel: string;
    /**
     * Local calendar date label shown under the primary time.
     */
    readonly localDateLabel: string;
    /**
     * Exact local timestamp label used in detail sections.
     */
    readonly localDateTimeLabel: string;
    /**
     * Relative label such as `in 5 minutes` or `2 minutes ago`.
     */
    readonly relativeTimeLabel: string | null;
};

/**
 * Seconds in one minute.
 *
 * @private utility of `<Chat/>`
 */
const SECONDS_IN_MINUTE = 60;

/**
 * Minutes in one hour.
 *
 * @private utility of `<Chat/>`
 */
const MINUTES_IN_HOUR = 60;

/**
 * Hours in one day.
 *
 * @private utility of `<Chat/>`
 */
const HOURS_IN_DAY = 24;

/**
 * Formats one tool-call timestamp into shared locale-aware labels.
 *
 * @param date - Timestamp to format.
 * @param options - Optional locale and relative-time reference point.
 * @returns Shared labels consumed by tool-call chips and modals.
 *
 * @private utility of `<Chat/>`
 */
export function formatToolCallDateTime(
    date: Date,
    options: {
        locale?: string;
        currentDate?: Date;
    } = {},
): ToolCallDateTimeLabels {
    const normalizedLocale = normalizeToolCallLocale(options.locale);
    const currentDate = options.currentDate || null;

    return {
        localTimeLabel: new Intl.DateTimeFormat(normalizedLocale, {
            hour: 'numeric',
            minute: '2-digit',
        }).format(date),
        localDateLabel: new Intl.DateTimeFormat(normalizedLocale, {
            dateStyle: 'medium',
        }).format(date),
        localDateTimeLabel: new Intl.DateTimeFormat(normalizedLocale, {
            dateStyle: 'medium',
            timeStyle: 'medium',
        }).format(date),
        relativeTimeLabel: currentDate ? formatRelativeToolCallTime(date, currentDate, normalizedLocale) : null,
    };
}

/**
 * Normalizes optional locale input before it is passed into `Intl`.
 *
 * @param locale - Potential BCP-47 locale string.
 * @returns Sanitized locale or `undefined` for runtime defaults.
 *
 * @private utility of `<Chat/>`
 */
function normalizeToolCallLocale(locale?: string): string | undefined {
    if (typeof locale !== 'string') {
        return undefined;
    }

    const normalizedLocale = locale.trim();
    return normalizedLocale || undefined;
}

/**
 * Builds one localized relative-time label for tool-call timestamps.
 *
 * @param date - Target timestamp.
 * @param currentDate - Reference timestamp used for comparison.
 * @param locale - Sanitized locale passed to `Intl.RelativeTimeFormat`.
 * @returns Relative label or `null` when both timestamps are equal.
 *
 * @private utility of `<Chat/>`
 */
function formatRelativeToolCallTime(date: Date, currentDate: Date, locale?: string): string | null {
    const millisecondsDifference = date.getTime() - currentDate.getTime();
    if (!Number.isFinite(millisecondsDifference) || millisecondsDifference === 0) {
        return null;
    }

    const secondsDifference = Math.round(millisecondsDifference / 1_000);
    const absoluteSecondsDifference = Math.abs(secondsDifference);
    const formatter = new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
    });

    if (absoluteSecondsDifference < SECONDS_IN_MINUTE) {
        return formatter.format(secondsDifference, 'second');
    }

    if (absoluteSecondsDifference < SECONDS_IN_MINUTE * MINUTES_IN_HOUR) {
        return formatter.format(Math.round(secondsDifference / SECONDS_IN_MINUTE), 'minute');
    }

    if (absoluteSecondsDifference < HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE) {
        return formatter.format(Math.round(secondsDifference / (SECONDS_IN_MINUTE * MINUTES_IN_HOUR)), 'hour');
    }

    return formatter.format(
        Math.round(secondsDifference / (HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE)),
        'day',
    );
}
