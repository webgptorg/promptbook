import { spaceTrim } from 'spacetrim';

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
                review the planned messages I already have, and plan or cancel a wake-up with the
                planned-message capability of my invocation so I do not create duplicates.
            `,
        );
    }

    return spaceTrim(
        (block) => `
            📝 My book was updated, so \`${options.agentName}\` may work differently from now on.

            ${block(goalSection)}

            I should re-check my work and planned messages against this new goal, act on it now when useful,
            and really plan another goal-chat wake-up when future follow-up is needed — announcing one
            without planning it changes nothing.
        `,
    );
}

/**
 * Builds the goal-chat note left when a planned message is scheduled.
 *
 * @param options - Planned-message identity, due time, and optional payload message.
 * @returns Note content stored as one agent message.
 */
export function createAgentGoalChatPlannedMessageNoteContent(options: {
    readonly timeoutId: string;
    readonly dueAt: string;
    readonly message?: string | null;
}): string {
    const plannedMessage = options.message?.trim() || '';

    return spaceTrim(
        (block) => `
            ⏳ I planned a message that will wake me up at ${options.dueAt}.

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
