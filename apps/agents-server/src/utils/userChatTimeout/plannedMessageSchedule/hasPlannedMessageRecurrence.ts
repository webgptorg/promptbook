import type { PlannedMessageSchedule } from './PlannedMessageSchedule';

/**
 * Determines whether one planned message can wake the agent more than once.
 *
 * @param schedule - Recurrence rule of the planned message.
 * @returns `true` when the schedule has a cron expression or a fixed repeat interval.
 *
 * @private function of `plannedMessageSchedule`
 */
export function hasPlannedMessageRecurrence(schedule: PlannedMessageSchedule): boolean {
    return Boolean(schedule.cronExpression || schedule.recurrenceIntervalMs);
}
