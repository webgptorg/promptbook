import type { PlannedMessageSchedule } from './PlannedMessageSchedule';
import { normalizePlannedMessageDateIso } from './normalizePlannedMessageScheduleValues';

/**
 * Determines whether one planned message must never wake the agent again.
 *
 * A planned message is finished once it ran as many times as it was planned to run, or once its
 * ending date has passed. Such a message is closed instead of being fired, so an agent is never woken
 * by a plan it already completed.
 *
 * @param options - Recurrence rule, how many times it already ran, and the moment being judged.
 * @returns `true` when no further wake-up is allowed.
 *
 * @private function of `plannedMessageSchedule`
 */
export function isPlannedMessageScheduleFinished(options: {
    readonly schedule: PlannedMessageSchedule;
    readonly completedRunCount: number;
    readonly atDate: Date;
}): boolean {
    const { schedule, completedRunCount, atDate } = options;

    if (schedule.maxRunCount !== null && completedRunCount >= schedule.maxRunCount) {
        return true;
    }

    const endsAtIso = normalizePlannedMessageDateIso(schedule.endsAt);

    return endsAtIso !== null && atDate.getTime() > Date.parse(endsAtIso);
}
