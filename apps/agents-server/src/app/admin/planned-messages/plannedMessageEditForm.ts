'use client';

import type { PlannedMessageRecurrenceKind } from '@/src/utils/plannedMessageManager/resolvePlannedMessageRecurrenceKind';
import type { PlannedMessageManagerRecord, PlannedMessageManagerUpdatePayload } from '@/src/utils/plannedMessagesAdmin';

/**
 * Unit one repeat interval is edited in.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
export type PlannedMessageIntervalUnit = 'minutes' | 'hours' | 'days';

/**
 * Length of each editable interval unit, in milliseconds.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
const PLANNED_MESSAGE_INTERVAL_UNIT_MS: Record<PlannedMessageIntervalUnit, number> = {
    minutes: 60_000,
    hours: 60 * 60_000,
    days: 24 * 60 * 60_000,
};

/**
 * Units tried when showing a stored interval, from the longest to the shortest.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
const PLANNED_MESSAGE_INTERVAL_UNITS_BY_LENGTH: ReadonlyArray<PlannedMessageIntervalUnit> = [
    'days',
    'hours',
    'minutes',
];

/**
 * Editable form of one planned message.
 *
 * Every field is kept as the text the administrator typed, so what is validated is exactly what was
 * entered — the shared planned-message service is the one place saying whether it is allowed.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
export type PlannedMessageEditForm = {
    readonly message: string;
    readonly recurrenceKind: PlannedMessageRecurrenceKind;
    readonly intervalValue: string;
    readonly intervalUnit: PlannedMessageIntervalUnit;
    readonly cronExpression: string;
    readonly startsAtLocal: string;
    readonly endsAtLocal: string;
    readonly maxRunCount: string;
};

/**
 * Fills the edit form with the plan one planned message has today.
 *
 * @param plannedMessage - Planned message being edited.
 * @returns Form describing its current plan.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
export function createPlannedMessageEditForm(plannedMessage: PlannedMessageManagerRecord): PlannedMessageEditForm {
    const interval = resolvePlannedMessageIntervalFields(plannedMessage.recurrenceIntervalMs);

    return {
        message: plannedMessage.message || '',
        recurrenceKind: plannedMessage.recurrenceKind,
        intervalValue: interval.value,
        intervalUnit: interval.unit,
        cronExpression: plannedMessage.cronExpression || '',
        startsAtLocal: formatIsoAsDateTimeLocalValue(plannedMessage.startsAt),
        endsAtLocal: formatIsoAsDateTimeLocalValue(plannedMessage.endsAt),
        maxRunCount: plannedMessage.maxRunCount === null ? '' : String(plannedMessage.maxRunCount),
    };
}

/**
 * Turns the edit form into the change sent to the server.
 *
 * The whole plan is sent, not only what changed, so an emptied field really removes its bound instead
 * of silently keeping the stored one.
 *
 * @param form - Form as the administrator filled it in.
 * @returns Requested change.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
export function createPlannedMessageUpdatePayload(form: PlannedMessageEditForm): PlannedMessageManagerUpdatePayload {
    return {
        message: form.message.trim(),
        milliseconds: form.recurrenceKind === 'INTERVAL' ? resolvePlannedMessageIntervalMs(form) : null,
        cronExpression: form.recurrenceKind === 'CRON' ? form.cronExpression.trim() : null,
        startsAt: parseDateTimeLocalValueAsIso(form.startsAtLocal),
        endsAt: parseDateTimeLocalValueAsIso(form.endsAtLocal),
        maxRunCount: form.maxRunCount.trim() === '' ? null : Number(form.maxRunCount),
    };
}

/**
 * Resolves the repeat interval described by the form, in milliseconds.
 *
 * @param form - Form as the administrator filled it in.
 * @returns Interval in milliseconds, or `null` when nothing usable was typed.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
function resolvePlannedMessageIntervalMs(form: PlannedMessageEditForm): number | null {
    const intervalValue = Number(form.intervalValue);

    if (!Number.isFinite(intervalValue)) {
        return null;
    }

    return Math.floor(intervalValue * PLANNED_MESSAGE_INTERVAL_UNIT_MS[form.intervalUnit]);
}

/**
 * Splits one stored interval into the longest unit that describes it as a whole number.
 *
 * @param recurrenceIntervalMs - Stored repeat interval.
 * @returns Interval value and unit shown in the form.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
function resolvePlannedMessageIntervalFields(recurrenceIntervalMs: number | null): {
    value: string;
    unit: PlannedMessageIntervalUnit;
} {
    if (!recurrenceIntervalMs) {
        return { value: '', unit: 'minutes' };
    }

    for (const unit of PLANNED_MESSAGE_INTERVAL_UNITS_BY_LENGTH) {
        const unitMs = PLANNED_MESSAGE_INTERVAL_UNIT_MS[unit];

        if (recurrenceIntervalMs % unitMs === 0) {
            return { value: String(recurrenceIntervalMs / unitMs), unit };
        }
    }

    return { value: String(recurrenceIntervalMs / PLANNED_MESSAGE_INTERVAL_UNIT_MS.minutes), unit: 'minutes' };
}

/**
 * Formats one stored moment for a `datetime-local` input, in the administrator's own time zone.
 *
 * @param isoDate - Stored moment, or `null`.
 * @returns Local `YYYY-MM-DDTHH:mm` text, or an empty string.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
export function formatIsoAsDateTimeLocalValue(isoDate: string | null): string {
    if (isoDate === null) {
        return '';
    }

    const parsedDate = new Date(isoDate);

    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000);

    return localDate.toISOString().slice(0, 16);
}

/**
 * Reads one `datetime-local` input back as a stored moment.
 *
 * @param dateTimeLocalValue - Local `YYYY-MM-DDTHH:mm` text.
 * @returns ISO moment, or `null` when the field was left empty.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
export function parseDateTimeLocalValueAsIso(dateTimeLocalValue: string): string | null {
    const trimmedValue = dateTimeLocalValue.trim();

    if (trimmedValue === '') {
        return null;
    }

    const parsedDate = new Date(trimmedValue);

    return Number.isNaN(parsedDate.getTime()) ? trimmedValue : parsedDate.toISOString();
}
