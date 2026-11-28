import { resolveNextCronRun } from '../../cronExpression';
import type { PlannedMessageSchedule } from './PlannedMessageSchedule';
import { hasPlannedMessageRecurrence } from './hasPlannedMessageRecurrence';
import { isPlannedMessageScheduleFinished } from './isPlannedMessageScheduleFinished';
import { normalizePlannedMessageDateIso } from './normalizePlannedMessageScheduleValues';

/**
 * Resolves when one planned message wakes the agent next.
 *
 * This is the single place deciding the whole life of a planned message: it answers both "when does it
 * fire for the first time" and "when does it fire again after this firing", and it answers `null` when
 * the plan is over — because it ran often enough, because its ending date passed, or because it never
 * repeated in the first place.
 *
 * @param options - Recurrence rule, how many times the message already ran, the moment to schedule
 *                  from, and the delay used by a planned message without any recurrence.
 * @returns Next wake-up time, or `null` when the planned message is finished.
 *
 * @private function of `plannedMessageSchedule`
 */
export function resolvePlannedMessageDueAt(options: {
    readonly schedule: PlannedMessageSchedule;
    readonly completedRunCount: number;
    readonly afterDate: Date;
    readonly fallbackDelayMs?: number | null;
}): Date | null {
    const { schedule, completedRunCount, afterDate } = options;

    if (isPlannedMessageScheduleFinished({ schedule, completedRunCount, atDate: afterDate })) {
        return null;
    }

    const startsAtDate = resolvePlannedMessageStartDate(schedule);
    const dueAtDate = resolvePlannedMessageCandidateDueAt({
        schedule,
        completedRunCount,
        afterDate,
        startsAtDate,
        fallbackDelayMs: options.fallbackDelayMs ?? null,
    });

    if (dueAtDate === null) {
        return null;
    }

    return isPlannedMessageDueAtAfterEnd(schedule, dueAtDate) ? null : dueAtDate;
}

/**
 * Resolves the raw next wake-up time before the ending date is applied.
 *
 * @param options - Recurrence rule with the resolved starting date and the scheduling moment.
 * @returns Candidate wake-up time, or `null` when the recurrence rule offers none.
 *
 * @private function of `resolvePlannedMessageDueAt`
 */
function resolvePlannedMessageCandidateDueAt(options: {
    readonly schedule: PlannedMessageSchedule;
    readonly completedRunCount: number;
    readonly afterDate: Date;
    readonly startsAtDate: Date | null;
    readonly fallbackDelayMs: number | null;
}): Date | null {
    const { schedule, completedRunCount, afterDate, startsAtDate, fallbackDelayMs } = options;

    if (!hasPlannedMessageRecurrence(schedule) && completedRunCount > 0) {
        // Note: A planned message without any recurrence wakes the agent exactly once
        return null;
    }

    const isWaitingForStart = startsAtDate !== null && startsAtDate.getTime() > afterDate.getTime();

    if (schedule.cronExpression) {
        // Note: One millisecond before the starting date keeps a cron run happening exactly at that date
        return resolveNextCronRun(
            schedule.cronExpression,
            isWaitingForStart ? new Date(startsAtDate!.getTime() - 1) : afterDate,
        );
    }

    if (isWaitingForStart) {
        // Note: A planned message never wakes the agent before its starting date, and an interval schedule
        //       wakes it for the first time exactly then
        return startsAtDate;
    }

    if (schedule.recurrenceIntervalMs) {
        return new Date(afterDate.getTime() + schedule.recurrenceIntervalMs);
    }

    return fallbackDelayMs === null ? null : new Date(afterDate.getTime() + fallbackDelayMs);
}

/**
 * Resolves the starting date of one planned message.
 *
 * @param schedule - Recurrence rule of the planned message.
 * @returns Starting date, or `null` when the planned message may start immediately.
 *
 * @private function of `resolvePlannedMessageDueAt`
 */
function resolvePlannedMessageStartDate(schedule: PlannedMessageSchedule): Date | null {
    const startsAtIso = normalizePlannedMessageDateIso(schedule.startsAt);

    return startsAtIso === null ? null : new Date(startsAtIso);
}

/**
 * Determines whether one candidate wake-up happens after the ending date.
 *
 * @param schedule - Recurrence rule of the planned message.
 * @param dueAtDate - Candidate wake-up time.
 * @returns `true` when the candidate is outside the planned window.
 *
 * @private function of `resolvePlannedMessageDueAt`
 */
function isPlannedMessageDueAtAfterEnd(schedule: PlannedMessageSchedule, dueAtDate: Date): boolean {
    const endsAtIso = normalizePlannedMessageDateIso(schedule.endsAt);

    return endsAtIso !== null && dueAtDate.getTime() > Date.parse(endsAtIso);
}
