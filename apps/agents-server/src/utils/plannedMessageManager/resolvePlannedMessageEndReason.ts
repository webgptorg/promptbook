import { resolvePlannedMessageRecurrenceKind } from './resolvePlannedMessageRecurrenceKind';

/**
 * Why one planned message stopped waking its agent.
 *
 * `null` means the planned message is not over, or that nothing in its own schedule explains the end
 * — a cancelled or failed message ends for a reason outside its schedule.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageEndReason = 'MAX_RUNS_REACHED' | 'ENDING_DATE_PASSED' | 'SINGLE_RUN_DONE' | null;

/**
 * Stored fields deciding why one planned message is over.
 *
 * @private internal admin utility of Agents Server
 */
export type PlannedMessageEndReasonInput = {
    readonly recurrenceIntervalMs: number | null;
    readonly cronExpression: string | null;
    readonly endsAt: string | null;
    readonly maxRunCount: number | null;
    readonly runCount: number;
};

/**
 * Resolves why one finished planned message will never wake its agent again.
 *
 * The bounds are read in the same order the scheduler applies them, so the manager explains an ended
 * plan exactly the way it really ended.
 *
 * @param plannedMessage - Stored planned message that is already over.
 * @param atDate - Moment the ending is judged at.
 * @returns Reason the plan is over, or `null` when its schedule does not explain the end.
 *
 * @private internal admin utility of Agents Server
 */
export function resolvePlannedMessageEndReason(
    plannedMessage: PlannedMessageEndReasonInput,
    atDate: Date,
): PlannedMessageEndReason {
    if (plannedMessage.maxRunCount !== null && plannedMessage.runCount >= plannedMessage.maxRunCount) {
        return 'MAX_RUNS_REACHED';
    }

    if (plannedMessage.endsAt !== null) {
        const endsAtTime = Date.parse(plannedMessage.endsAt);

        if (Number.isFinite(endsAtTime) && endsAtTime <= atDate.getTime()) {
            return 'ENDING_DATE_PASSED';
        }
    }

    if (resolvePlannedMessageRecurrenceKind(plannedMessage) === 'ONCE') {
        return 'SINGLE_RUN_DONE';
    }

    return null;
}
