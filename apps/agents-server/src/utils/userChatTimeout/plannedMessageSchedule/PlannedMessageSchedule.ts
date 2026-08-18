/**
 * Shortest repeat interval one planned message may use.
 *
 * A planned message wakes a whole agent invocation, so an interval below one minute would turn a plan
 * into an unattended self-invocation loop. Cron expressions have the very same one-minute resolution.
 *
 * @private constant of `plannedMessageSchedule`
 */
export const MINIMUM_PLANNED_MESSAGE_INTERVAL_MS = 60_000;

/**
 * Complete recurrence rule of one planned message.
 *
 * A planned message can be a one-shot wake-up, an endless repetition, or anything between the two:
 * `cronExpression` or `recurrenceIntervalMs` says how it repeats, while `startsAt`, `endsAt`, and
 * `maxRunCount` bound how long it keeps repeating.
 *
 * Field names match `UserChatTimeoutRecord`, so one stored timeout row is already a valid schedule.
 *
 * @private type of `plannedMessageSchedule`
 */
export type PlannedMessageSchedule = {
    /**
     * Five-field cron expression evaluated in the local server time, or `null` when the planned
     * message does not follow a cron.
     */
    readonly cronExpression: string | null;

    /**
     * Fixed repeat interval in milliseconds, or `null` when the planned message does not repeat at a
     * fixed interval.
     */
    readonly recurrenceIntervalMs: number | null;

    /**
     * Moment before which the planned message never wakes the agent, or `null` when it may start
     * immediately.
     */
    readonly startsAt: string | null;

    /**
     * Moment after which the planned message never wakes the agent again, or `null` when it has no
     * ending date.
     */
    readonly endsAt: string | null;

    /**
     * Total number of times the planned message wakes the agent, or `null` when it repeats until it
     * is cancelled.
     */
    readonly maxRunCount: number | null;
};
