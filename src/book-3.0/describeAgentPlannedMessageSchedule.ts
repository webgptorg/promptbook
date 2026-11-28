import { formatTimeoutDurationHuman } from '../book-components/Chat/utils/timeoutToolCallPresentation';

/**
 * Schedule of one planned message as it is described to an agent.
 *
 * The fields match `AgentPlannedMessageSnapshot`, so one snapshot, one scheduling result, and one
 * stored planned message are all described by the very same sentence.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export type AgentPlannedMessageScheduleDescription = {
    readonly intervalMs?: number | null;
    readonly cronExpression?: string | null;
    readonly startsAt?: string | null;
    readonly endsAt?: string | null;
    readonly maxRunCount?: number | null;
    readonly runCount?: number | null;
    readonly dueAt?: string | null;
};

/**
 * Describes one planned-message schedule in a single sentence fragment.
 *
 * A planned message can repeat forever, repeat a bounded number of times, run inside a date window, or
 * wake the agent only once. Every surface showing a planned message — the wake-up itself, the goal-chat
 * notes, the planned-message prompt section, and the model tools — describes it with this one helper,
 * so an agent never has to reconcile two different wordings of the same plan.
 *
 * @param schedule - Schedule of the planned message.
 * @returns Fragment such as `repeats every 5 minutes (2 of 10 runs done)`.
 *
 * @private internal utility of the Agents Server planned messages
 */
export function describeAgentPlannedMessageSchedule(schedule: AgentPlannedMessageScheduleDescription): string {
    const scheduleParts = [
        describeAgentPlannedMessageRecurrence(schedule),
        ...describeAgentPlannedMessageBounds(schedule),
    ];

    return scheduleParts.join(', ');
}

/**
 * Describes how often one planned message wakes the agent.
 *
 * @param schedule - Schedule of the planned message.
 * @returns Recurrence fragment.
 *
 * @private internal utility of `describeAgentPlannedMessageSchedule`
 */
function describeAgentPlannedMessageRecurrence(schedule: AgentPlannedMessageScheduleDescription): string {
    if (schedule.cronExpression) {
        return `repeats on cron \`${schedule.cronExpression}\``;
    }

    if (schedule.intervalMs) {
        return `repeats every ${formatTimeoutDurationHuman(schedule.intervalMs)}`;
    }

    return schedule.dueAt ? `wakes you once at ${schedule.dueAt}` : 'wakes you once';
}

/**
 * Describes the bounds limiting how long one planned message keeps repeating.
 *
 * @param schedule - Schedule of the planned message.
 * @returns Fragments for the starting date, ending date, and run count that are really set.
 *
 * @private internal utility of `describeAgentPlannedMessageSchedule`
 */
function describeAgentPlannedMessageBounds(schedule: AgentPlannedMessageScheduleDescription): Array<string> {
    const bounds: Array<string> = [];
    const runCount = schedule.runCount || 0;

    if (schedule.startsAt) {
        bounds.push(`starting ${schedule.startsAt}`);
    }

    if (schedule.endsAt) {
        bounds.push(`until ${schedule.endsAt}`);
    }

    if (schedule.maxRunCount) {
        bounds.push(`${runCount} of ${schedule.maxRunCount} runs done`);
    } else if (runCount > 0) {
        bounds.push(`${runCount} run${runCount === 1 ? '' : 's'} done`);
    }

    if ((schedule.cronExpression || schedule.intervalMs) && schedule.dueAt) {
        bounds.push(`next at ${schedule.dueAt}`);
    }

    return bounds;
}
