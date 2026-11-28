import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../../src/errors/ParseError';
import { normalizeCronExpression } from '../../cronExpression';
import { MINIMUM_PLANNED_MESSAGE_INTERVAL_MS, type PlannedMessageSchedule } from './PlannedMessageSchedule';
import { normalizePlannedMessageDateIso } from './normalizePlannedMessageScheduleValues';

/**
 * Untrusted schedule fields of one planned message, as written by a model, a coding harness, or the
 * internal runtime API.
 *
 * A missing field means "not requested", while an explicit `null` means "no such bound", which is what
 * lets one update remove an ending date or a run-count limit.
 *
 * @private type of `plannedMessageSchedule`
 */
export type PlannedMessageScheduleInput = {
    readonly milliseconds?: unknown;
    readonly cronExpression?: unknown;
    readonly startsAt?: unknown;
    readonly endsAt?: unknown;
    readonly maxRunCount?: unknown;
};

/**
 * Parses one untrusted planned-message schedule.
 *
 * @param input - Schedule fields requested by an agent.
 * @returns Validated recurrence rule.
 *
 * @private function of `plannedMessageSchedule`
 */
export function parsePlannedMessageSchedule(input: PlannedMessageScheduleInput): PlannedMessageSchedule {
    const cronExpression = parsePlannedMessageCronExpression(input.cronExpression);
    const recurrenceIntervalMs = parsePlannedMessageIntervalMs(input.milliseconds);

    if (cronExpression !== null && recurrenceIntervalMs !== null) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message schedule.

                - Use either \`cronExpression\` or \`milliseconds\`, **not both**.
            `),
        );
    }

    const startsAt = parsePlannedMessageBoundaryDate(input.startsAt, 'startsAt');
    const endsAt = parsePlannedMessageBoundaryDate(input.endsAt, 'endsAt');

    if (startsAt !== null && endsAt !== null && Date.parse(endsAt) <= Date.parse(startsAt)) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message schedule.

                - \`endsAt\` must be **after** \`startsAt\`.
            `),
        );
    }

    if (cronExpression === null && recurrenceIntervalMs === null && startsAt === null) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message schedule.

                - Say when the planned message wakes you with \`cronExpression\`, \`milliseconds\`, or \`startsAt\`.
                - Use \`maxRunCount\` and \`endsAt\` only to **bound** a schedule, never as the schedule itself.
            `),
        );
    }

    return {
        cronExpression,
        recurrenceIntervalMs,
        startsAt,
        endsAt,
        maxRunCount: parsePlannedMessageMaxRunCount(input.maxRunCount),
    };
}

/**
 * Parses one untrusted cron expression of a planned message.
 *
 * @param rawCronExpression - Untrusted cron expression.
 * @returns Normalized expression, or `null` when none was requested.
 *
 * @private function of `parsePlannedMessageSchedule`
 */
function parsePlannedMessageCronExpression(rawCronExpression: unknown): string | null {
    if (rawCronExpression === undefined || rawCronExpression === null || rawCronExpression === '') {
        return null;
    }

    if (typeof rawCronExpression !== 'string') {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message \`cronExpression\`.

                - Use a five-field cron string such as \`0 9 * * 1-5\`.
            `),
        );
    }

    try {
        return normalizeCronExpression(rawCronExpression);
    } catch (error) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Invalid planned-message \`cronExpression\`.

                    ${block(error instanceof Error ? error.message : String(error))}
                `,
            ),
        );
    }
}

/**
 * Parses one untrusted repeat interval of a planned message.
 *
 * @param rawMilliseconds - Untrusted interval in milliseconds.
 * @returns Repeat interval in whole milliseconds, or `null` when none was requested.
 *
 * @private function of `parsePlannedMessageSchedule`
 */
function parsePlannedMessageIntervalMs(rawMilliseconds: unknown): number | null {
    if (rawMilliseconds === undefined || rawMilliseconds === null) {
        return null;
    }

    const milliseconds = Number(rawMilliseconds);

    if (!Number.isFinite(milliseconds) || milliseconds < MINIMUM_PLANNED_MESSAGE_INTERVAL_MS) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message interval.

                - A planned message **repeats** at this interval until it is cancelled or bounded by \`maxRunCount\` or \`endsAt\`.
                - \`milliseconds\` must be a number of at least \`${MINIMUM_PLANNED_MESSAGE_INTERVAL_MS}\`.
            `),
        );
    }

    return Math.floor(milliseconds);
}

/**
 * Parses one untrusted total run count of a planned message.
 *
 * @param rawMaxRunCount - Untrusted run-count limit.
 * @returns Whole positive limit, or `null` when the planned message repeats without a count limit.
 *
 * @private function of `parsePlannedMessageSchedule`
 */
function parsePlannedMessageMaxRunCount(rawMaxRunCount: unknown): number | null {
    if (rawMaxRunCount === undefined || rawMaxRunCount === null) {
        return null;
    }

    const maxRunCount = Number(rawMaxRunCount);

    if (!Number.isInteger(maxRunCount) || maxRunCount < 1) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message \`maxRunCount\`.

                - Use a whole number of at least \`1\`, which is **how many times in total** the planned message wakes you.
                - Leave it out for a planned message that repeats until it is cancelled.
            `),
        );
    }

    return maxRunCount;
}

/**
 * Parses one untrusted starting or ending date of a planned message.
 *
 * @param rawDate - Untrusted date value.
 * @param fieldName - Field name used in a detailed parse error.
 * @returns ISO timestamp, or `null` when the boundary was not requested.
 *
 * @private function of `parsePlannedMessageSchedule`
 */
function parsePlannedMessageBoundaryDate(rawDate: unknown, fieldName: 'startsAt' | 'endsAt'): string | null {
    if (rawDate === undefined || rawDate === null || rawDate === '') {
        return null;
    }

    const dateIso = normalizePlannedMessageDateIso(rawDate);

    if (dateIso === null) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message \`${fieldName}\`.

                - Use an ISO date such as \`2026-08-20T09:00:00.000Z\`.
            `),
        );
    }

    return dateIso;
}
