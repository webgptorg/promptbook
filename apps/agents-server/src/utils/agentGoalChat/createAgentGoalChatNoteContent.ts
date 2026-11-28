import { spaceTrim } from 'spacetrim';
import {
    describeAgentPlannedMessageSchedule,
    type AgentPlannedMessageScheduleDescription,
} from '../../../../../src/book-3.0/describeAgentPlannedMessageSchedule';

/**
 * Lifecycle events of an agent that are recorded in its goal chat.
 */
export type AgentGoalChatLifecycleEvent = 'CREATED' | 'MODIFIED';

/**
 * Builds the goal-chat note left when an agent is created or its book is modified.
 *
 * @param options - Lifecycle event and the agent name shown in the note.
 * @returns Note content stored as one agent message.
 */
export function createAgentGoalChatLifecycleNoteContent(options: {
    readonly event: AgentGoalChatLifecycleEvent;
    readonly agentName: string;
    readonly currentGoal: string | null;
}): string {
    const currentGoal = options.currentGoal?.trim() || null;
    const goalSection = currentGoal
        ? spaceTrim(
              (block) => `
                  My current goal is:

                  ${block(currentGoal)}
              `,
          )
        : 'I currently have no `GOAL` or `GOALS` commitment.';

    if (options.event === 'CREATED') {
        return spaceTrim(
            (block) => `
                🌱 I was created as \`${options.agentName}\`.

                ${block(goalSection)}

                This is my own thread for acting towards that goal. I should work on it now when useful,
                review the planned messages I already have, and plan a repeating wake-up with the
                planned-message capability of my invocation when my goal needs one that is not planned yet.
            `,
        );
    }

    return spaceTrim(
        (block) => `
            📝 My book was updated, so \`${options.agentName}\` may work differently from now on.

            ${block(goalSection)}

            I should re-check my work and planned messages against this new goal and act on it now when useful.
            My planned messages keep repeating on their own, so I keep the ones that still match this goal,
            and cancel and re-plan only the ones that do not — announcing a wake-up without planning it
            changes nothing.
        `,
    );
}

/**
 * Planned-message details shown in one goal-chat note.
 */
export type AgentGoalChatPlannedMessageNoteOptions = AgentPlannedMessageScheduleDescription & {
    readonly timeoutId: string;
    readonly dueAt: string;
    readonly message?: string | null;
};

/**
 * Builds the goal-chat note left when a planned message is scheduled.
 *
 * @param options - Planned-message identity, its whole schedule, and optional payload message.
 * @returns Note content stored as one agent message.
 */
export function createAgentGoalChatPlannedMessageNoteContent(options: AgentGoalChatPlannedMessageNoteOptions): string {
    return createAgentGoalChatPlannedMessageScheduleNoteContent('⏳ I planned a message that', options);
}

/**
 * Builds the goal-chat note left when the schedule of a planned message is changed.
 *
 * @param options - Planned-message identity, its new schedule, and optional payload message.
 * @returns Note content stored as one agent message.
 */
export function createAgentGoalChatUpdatedPlannedMessageNoteContent(
    options: AgentGoalChatPlannedMessageNoteOptions,
): string {
    return createAgentGoalChatPlannedMessageScheduleNoteContent('🔁 I changed a planned message, which now', options);
}

/**
 * Builds one goal-chat note describing the current schedule of a planned message.
 *
 * @param headlinePrefix - Sentence opening telling apart a new plan from a changed one.
 * @param options - Planned-message identity, its schedule, and optional payload message.
 * @returns Note content stored as one agent message.
 *
 * @private function of `createAgentGoalChatNoteContent`
 */
function createAgentGoalChatPlannedMessageScheduleNoteContent(
    headlinePrefix: string,
    options: AgentGoalChatPlannedMessageNoteOptions,
): string {
    const plannedMessage = options.message?.trim() || '';

    return spaceTrim(
        (block) => `
            ${headlinePrefix} ${describeAgentPlannedMessageSchedule(options)}.

            ${plannedMessage ? block(plannedMessage) : ''}

            timeoutId: ${options.timeoutId}
        `,
    );
}

/**
 * Builds the goal-chat note left when a planned message is cancelled.
 *
 * @param options - Planned-message identity.
 * @returns Note content stored as one agent message.
 */
export function createAgentGoalChatCancelledPlannedMessageNoteContent(options: { readonly timeoutId: string }): string {
    return spaceTrim(`
        🚫 I cancelled the planned message \`${options.timeoutId}\`, so it will not wake me up anymore.
    `);
}
