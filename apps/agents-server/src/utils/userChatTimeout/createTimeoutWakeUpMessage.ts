import { spaceTrim } from 'spacetrim';
import {
    describeAgentPlannedMessageSchedule,
    type AgentPlannedMessageScheduleDescription,
} from '../../../../../src/book-3.0/describeAgentPlannedMessageSchedule';

/**
 * Builds the synthetic user-like message injected when a timeout elapses.
 *
 * A planned message carries its whole schedule into its own wake-up, so the agent immediately knows
 * whether this was its last run and does not have to plan anything again just to keep the plan alive.
 *
 * @private internal utility of userChatTimeout
 */
export function createTimeoutWakeUpMessage(
    options: AgentPlannedMessageScheduleDescription & {
        readonly timeoutId: string;
        readonly durationMs: number;
        readonly message?: string | null;
    },
): string {
    const message = options.message?.trim() || '';

    return spaceTrim(
        (block) => `
            ${createTimeoutWakeUpHeadline(options)}
            timeoutId: ${options.timeoutId}
            ${message ? block(message) : ''}
        `,
    );
}

/**
 * Builds the first line of one wake-up, telling the agent what woke it and where in its plan it is.
 *
 * @param options - Schedule of the planned message together with the plain timeout duration.
 * @returns Headline of the wake-up message.
 *
 * @private internal utility of `createTimeoutWakeUpMessage`
 */
function createTimeoutWakeUpHeadline(
    options: AgentPlannedMessageScheduleDescription & { readonly durationMs: number },
): string {
    if (options.intervalMs || options.cronExpression) {
        // Note: The next wake-up is resolved only after this one is queued, so the schedule is described without it
        return `⏱️ Planned message elapsed, ${describeAgentPlannedMessageSchedule({ ...options, dueAt: null })}.`;
    }

    if (options.maxRunCount || options.startsAt) {
        return '⏱️ Planned message elapsed, this was its only wake-up.';
    }

    return `⏱️ Timeout elapsed after ${options.durationMs}ms.`;
}
