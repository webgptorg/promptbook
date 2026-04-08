import type { TODO_any } from '../../../utils/organization/TODO_any';
import { formatToolCallDateTime } from './formatToolCallDateTime';
import { formatToolCallTranslationTemplate } from './formatToolCallTranslationTemplate';

/**
 * Tool names handled by timeout-specific chat presentation.
 *
 * @private internal timeout-chat constant
 */
const TIMEOUT_TOOL_NAMES = ['set_timeout', 'cancel_timeout'] as const;

/**
 * Milliseconds in one second.
 *
 * @private internal timeout-chat constant
 */
const SECOND_IN_MILLISECONDS = 1_000;

/**
 * Seconds in one minute.
 *
 * @private internal timeout-chat constant
 */
const MINUTE_IN_SECONDS = 60;

/**
 * Seconds in one hour.
 *
 * @private internal timeout-chat constant
 */
const HOUR_IN_SECONDS = 60 * MINUTE_IN_SECONDS;

/**
 * Seconds in one day.
 *
 * @private internal timeout-chat constant
 */
const HOURS_IN_DAY = 24;

/**
 * Seconds in one day.
 *
 * @private internal timeout-chat constant
 */
const DAY_IN_SECONDS = HOURS_IN_DAY * HOUR_IN_SECONDS;

/**
 * Threshold below which compact labels include seconds.
 *
 * @private internal timeout-chat constant
 */
const SECONDS_VISIBILITY_THRESHOLD_SECONDS = 3 * MINUTE_IN_SECONDS;

/**
 * Action performed by timeout tools.
 *
 * @private internal timeout-chat type
 */
export type TimeoutToolCallAction = 'set' | 'cancel';

/**
 * Friendly presentation payload derived from timeout tool arguments and result.
 *
 * @private internal utility of `<Chat/>`
 */
export type TimeoutToolCallPresentation = {
    /**
     * Timeout action represented by this tool call.
     */
    readonly action: TimeoutToolCallAction;

    /**
     * Timeout operation status from tool result.
     */
    readonly status: string | null;

    /**
     * Requested timeout duration in milliseconds.
     */
    readonly milliseconds: number | null;

    /**
     * Optional timeout identifier returned by runtime.
     */
    readonly timeoutId: string | null;

    /**
     * Optional custom timeout wake-up message.
     */
    readonly message: string | null;

    /**
     * Parsed due date for scheduled timeout.
     */
    readonly dueAtDate: Date | null;

    /**
     * Exact due timestamp in ISO UTC format.
     */
    readonly dueAtIsoUtc: string | null;

    /**
     * Local timezone used for user-facing rendering.
     */
    readonly localTimezone: string;

    /**
     * Compact duration label used by timeout chips.
     */
    readonly compactDurationLabel: string | null;

    /**
     * Long duration label used by timeout detail popup copy.
     */
    readonly humanDurationLabel: string | null;

    /**
     * Relative time label resolved from due date and current time.
     */
    readonly relativeDueLabel: string | null;

    /**
     * Localized due time for friendly popups.
     */
    readonly localDueTimeLabel: string | null;

    /**
     * Localized due date for friendly popups.
     */
    readonly localDueDateLabel: string | null;
};

/**
 * Optional localized labels used by timeout chips and friendly modal copy.
 *
 * @private internal utility of `<Chat/>`
 */
type TimeoutToolCallTranslations = {
    readonly toolCallTimeoutChipLabel?: string;
    readonly toolCallTimeoutChipCancelledLabel?: string;
    readonly toolCallTimeoutChipInactiveLabel?: string;
    readonly toolCallTimeoutChipUpdatedLabel?: string;
    readonly toolCallTimeoutChipFallbackLabel?: string;
    readonly toolCallTimeoutPrimaryScheduledLabel?: string;
    readonly toolCallTimeoutSecondaryDurationLabel?: string;
    readonly toolCallTimeoutPrimaryCancelledLabel?: string;
    readonly toolCallTimeoutPrimaryInactiveLabel?: string;
    readonly toolCallTimeoutPrimaryUpdatedLabel?: string;
    readonly toolCallTimeoutPrimaryFallbackLabel?: string;
};

/**
 * Inputs required to derive timeout presentation metadata.
 *
 * @private internal timeout-chat type
 */
type ResolveTimeoutToolCallPresentationOptions = {
    /**
     * Tool name being rendered.
     */
    readonly toolCallName: string;

    /**
     * Parsed tool arguments.
     */
    readonly args: Record<string, TODO_any>;

    /**
     * Parsed raw tool result payload.
     */
    readonly resultRaw: TODO_any;

    /**
     * Current date used to calculate relative labels.
     */
    readonly currentDate?: Date;

    /**
     * Optional BCP-47 locale string used to format local-time labels.
     * When omitted the browser/OS default locale is used.
     */
    readonly locale?: string;
};

/**
 * Determines whether a tool name belongs to the timeout commitment.
 *
 * @private internal utility of `<Chat/>`
 */
export function isTimeoutToolCallName(toolName: string): boolean {
    return TIMEOUT_TOOL_NAMES.includes(toolName as (typeof TIMEOUT_TOOL_NAMES)[number]);
}

/**
 * Resolves friendly timeout presentation metadata from one tool call payload.
 *
 * @private internal utility of `<Chat/>`
 */
export function resolveTimeoutToolCallPresentation(
    options: ResolveTimeoutToolCallPresentationOptions,
): TimeoutToolCallPresentation | null {
    const { toolCallName, args, resultRaw, locale } = options;
    if (!isTimeoutToolCallName(toolCallName)) {
        return null;
    }

    const resultObject =
        resultRaw && typeof resultRaw === 'object' && !Array.isArray(resultRaw)
            ? (resultRaw as Record<string, TODO_any>)
            : null;
    const defaultAction: TimeoutToolCallAction = toolCallName === 'cancel_timeout' ? 'cancel' : 'set';
    const action =
        resultObject?.action === 'cancel' || resultObject?.action === 'set'
            ? (resultObject.action as TimeoutToolCallAction)
            : defaultAction;
    const status = typeof resultObject?.status === 'string' ? resultObject.status : null;
    const milliseconds =
        parsePositiveNumber(args.milliseconds) ?? parsePositiveNumber(resultObject?.milliseconds) ?? null;
    const timeoutId = normalizeStringValue(resultObject?.timeoutId) ?? normalizeStringValue(args.timeoutId) ?? null;
    const message = normalizeStringValue(args.message) ?? normalizeStringValue(resultObject?.message) ?? null;
    const dueAtRaw = normalizeStringValue(resultObject?.dueAt) ?? normalizeStringValue(args.dueAt) ?? null;
    const dueAtDate = dueAtRaw ? parseDateValue(dueAtRaw) : null;
    const effectiveCurrentDate = options.currentDate || new Date();
    const dueAtLabels = dueAtDate
        ? formatToolCallDateTime(dueAtDate, { locale, currentDate: effectiveCurrentDate })
        : null;

    return {
        action,
        status,
        milliseconds,
        timeoutId,
        message,
        dueAtDate,
        dueAtIsoUtc: dueAtDate ? dueAtDate.toISOString() : null,
        localTimezone: resolveLocalTimezone(),
        compactDurationLabel: milliseconds !== null ? formatTimeoutDurationCompact(milliseconds) : null,
        humanDurationLabel: milliseconds !== null ? formatTimeoutDurationHuman(milliseconds) : null,
        relativeDueLabel: dueAtLabels?.relativeTimeLabel || null,
        localDueTimeLabel: dueAtLabels?.localTimeLabel || null,
        localDueDateLabel: dueAtLabels?.localDateLabel || null,
    };
}

/**
 * Builds concise chip text for timeout tool calls.
 *
 * @private internal utility of `<Chat/>`
 */
export function buildTimeoutToolCallChipLabel(
    presentation: TimeoutToolCallPresentation,
    translations?: TimeoutToolCallTranslations,
): string {
    if (presentation.action === 'cancel') {
        if (presentation.status === 'cancelled') {
            return translations?.toolCallTimeoutChipCancelledLabel || 'Timeout cancelled';
        }

        if (presentation.status === 'not_found') {
            return translations?.toolCallTimeoutChipInactiveLabel || 'Timeout inactive';
        }

        return translations?.toolCallTimeoutChipUpdatedLabel || 'Timeout update';
    }

    if (presentation.localDueTimeLabel) {
        return formatToolCallTranslationTemplate(translations?.toolCallTimeoutChipLabel || 'Timeout: {time}', {
            time: presentation.localDueTimeLabel,
        });
    }

    if (presentation.relativeDueLabel) {
        return `Scheduled: ${presentation.relativeDueLabel}`;
    }

    return translations?.toolCallTimeoutChipFallbackLabel || 'Timeout scheduled';
}

/**
 * Builds the primary timeout sentence shown in default modal view.
 *
 * @private internal utility of `<Chat/>`
 */
export function buildTimeoutToolPrimarySentence(
    presentation: TimeoutToolCallPresentation,
    translations?: TimeoutToolCallTranslations,
): string {
    if (presentation.action === 'cancel') {
        if (presentation.status === 'cancelled') {
            return translations?.toolCallTimeoutPrimaryCancelledLabel || 'The timeout has been cancelled.';
        }

        if (presentation.status === 'not_found') {
            return translations?.toolCallTimeoutPrimaryInactiveLabel || 'This timeout was already inactive.';
        }

        return translations?.toolCallTimeoutPrimaryUpdatedLabel || 'The timeout status has been updated.';
    }

    if (presentation.localDueTimeLabel) {
        return formatToolCallTranslationTemplate(
            translations?.toolCallTimeoutPrimaryScheduledLabel || 'Scheduled for {time}.',
            {
                time: presentation.localDueTimeLabel,
            },
        );
    }

    if (presentation.humanDurationLabel) {
        return formatToolCallTranslationTemplate(
            translations?.toolCallTimeoutSecondaryDurationLabel || 'Will retry in {duration}.',
            {
                duration: presentation.humanDurationLabel,
            },
        );
    }

    if (presentation.relativeDueLabel) {
        return `Scheduled ${presentation.relativeDueLabel}.`;
    }

    return translations?.toolCallTimeoutPrimaryFallbackLabel || 'The timeout has been scheduled.';
}

/**
 * Builds one default-view scheduling sentence with local-time and relative context.
 *
 * @private internal utility of `<Chat/>`
 */
export function buildTimeoutToolScheduleSentence(
    presentation: TimeoutToolCallPresentation,
    translations?: TimeoutToolCallTranslations,
): string | null {
    if (presentation.action === 'cancel' || !presentation.humanDurationLabel) {
        return null;
    }

    return formatToolCallTranslationTemplate(
        translations?.toolCallTimeoutSecondaryDurationLabel || 'Will retry in {duration}.',
        {
            duration: presentation.humanDurationLabel,
        },
    );
}

/**
 * Converts timeout duration into compact chip-safe text.
 *
 * @private internal timeout-chat helper
 */
function formatTimeoutDurationCompact(milliseconds: number): string {
    const normalizedMilliseconds = Math.max(0, Math.floor(milliseconds));
    const totalSeconds = Math.max(1, Math.floor(normalizedMilliseconds / SECOND_IN_MILLISECONDS));

    if (totalSeconds < MINUTE_IN_SECONDS) {
        return `${totalSeconds}s`;
    }

    if (totalSeconds < SECONDS_VISIBILITY_THRESHOLD_SECONDS) {
        const minutes = Math.floor(totalSeconds / MINUTE_IN_SECONDS);
        const seconds = totalSeconds % MINUTE_IN_SECONDS;

        return `${minutes}m ${seconds}s`;
    }

    if (totalSeconds < HOUR_IN_SECONDS) {
        return `${Math.floor(totalSeconds / MINUTE_IN_SECONDS)}m`;
    }

    if (totalSeconds < DAY_IN_SECONDS) {
        const hours = Math.floor(totalSeconds / HOUR_IN_SECONDS);
        const minutes = Math.floor((totalSeconds % HOUR_IN_SECONDS) / MINUTE_IN_SECONDS);

        return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
    }

    const days = Math.floor(totalSeconds / DAY_IN_SECONDS);
    const hours = Math.floor((totalSeconds % DAY_IN_SECONDS) / HOUR_IN_SECONDS);

    return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
}

/**
 * Converts timeout duration into natural language sentence fragments.
 *
 * @private internal timeout-chat helper
 */
function formatTimeoutDurationHuman(milliseconds: number): string {
    const normalizedMilliseconds = Math.max(0, Math.floor(milliseconds));
    const totalSeconds = Math.max(1, Math.floor(normalizedMilliseconds / SECOND_IN_MILLISECONDS));

    if (totalSeconds < MINUTE_IN_SECONDS) {
        return formatTimeoutUnit(totalSeconds, 'second');
    }

    if (totalSeconds < HOUR_IN_SECONDS) {
        const roundedMinutes = Math.max(1, Math.round(totalSeconds / MINUTE_IN_SECONDS));
        return formatTimeoutUnit(roundedMinutes, 'minute');
    }

    if (totalSeconds < DAY_IN_SECONDS) {
        const hours = Math.floor(totalSeconds / HOUR_IN_SECONDS);
        const minutes = Math.floor((totalSeconds % HOUR_IN_SECONDS) / MINUTE_IN_SECONDS);

        if (minutes === 0) {
            return formatTimeoutUnit(hours, 'hour');
        }

        return `${formatTimeoutUnit(hours, 'hour')} ${formatTimeoutUnit(minutes, 'minute')}`;
    }

    const days = Math.floor(totalSeconds / DAY_IN_SECONDS);
    const hours = Math.floor((totalSeconds % DAY_IN_SECONDS) / HOUR_IN_SECONDS);

    if (hours === 0) {
        return formatTimeoutUnit(days, 'day');
    }

    return `${formatTimeoutUnit(days, 'day')} ${formatTimeoutUnit(hours, 'hour')}`;
}

/**
 * Formats one pluralized timeout unit.
 *
 * @private internal timeout-chat helper
 */
function formatTimeoutUnit(value: number, unit: 'day' | 'hour' | 'minute' | 'second'): string {
    return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

/**
 * Parses date-like values into a valid `Date`.
 *
 * @private internal timeout-chat helper
 */
function parseDateValue(value: string): Date | null {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/**
 * Parses numbers and keeps only positive finite values.
 *
 * @private internal timeout-chat helper
 */
function parsePositiveNumber(value: TODO_any): number | null {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return Math.floor(parsedValue);
}

/**
 * Normalizes optional string values by trimming and dropping empties.
 *
 * @private internal timeout-chat helper
 */
function normalizeStringValue(value: TODO_any): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue || null;
}

/**
 * Resolves user local timezone name with a UTC fallback.
 *
 * @private internal timeout-chat helper
 */
function resolveLocalTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
