/**
 * How often one planned message wakes its agent.
 *
 * A planned message follows exactly one recurrence rule, so these three kinds are exhaustive.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageRecurrenceKind = 'ONCE' | 'INTERVAL' | 'CRON';

/**
 * Stored fields deciding how often one planned message repeats.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageRecurrenceInput = {
    readonly recurrenceIntervalMs: number | null;
    readonly cronExpression: string | null;
};

/**
 * Resolves how often one planned message wakes its agent.
 *
 * @param plannedMessage - Stored planned message.
 * @returns Recurrence kind of the planned message.
 *
 * @private internal admin utility of Agents Server
 */
export function resolvePlannedMessageRecurrenceKind(
    plannedMessage: PlannedMessageRecurrenceInput,
): PlannedMessageRecurrenceKind {
    if (plannedMessage.cronExpression) {
        return 'CRON';
    }

    if (plannedMessage.recurrenceIntervalMs) {
        return 'INTERVAL';
    }

    return 'ONCE';
}
