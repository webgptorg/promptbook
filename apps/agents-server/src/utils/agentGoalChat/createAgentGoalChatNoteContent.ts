import { spaceTrim } from 'spacetrim';
import { formatTimeoutDurationHuman } from '../../../../../src/book-components/Chat/utils/timeoutToolCallPresentation';

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
 * Builds the goal-chat note left when a planned message is scheduled.
 *
 * @param options - Planned-message identity, repeat interval, due time, and optional payload message.
 * @returns Note content stored as one agent message.
 */
export function createAgentGoalChatPlannedMessageNoteContent(options: {
    readonly timeoutId: string;
    readonly dueAt: string;
    readonly intervalMs?: number | null;
    readonly message?: string | null;
}): string {
    const plannedMessage = options.message?.trim() || '';
    const headline = options.intervalMs
        ? `⏳ I planned a message that will wake me up every ${formatTimeoutDurationHuman(
              options.intervalMs,
          )}, for the first time at ${options.dueAt}.`
        : `⏳ I planned a message that will wake me up at ${options.dueAt}.`;

    return spaceTrim(
        (block) => `
            ${headline}

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
export function createAgentGoalChatCancelledPlannedMessageNoteContent(options: {
    readonly timeoutId: string;
}): string {
    return spaceTrim(`
        🚫 I cancelled the planned message \`${options.timeoutId}\`, so it will not wake me up anymore.
    `);
}
