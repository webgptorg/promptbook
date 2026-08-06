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
}): string {
    if (options.event === 'CREATED') {
        return spaceTrim(`
            🌱 I was created as \`${options.agentName}\`.

            From now on I keep my own plans towards my goal in this thread.
        `);
    }

    return spaceTrim(`
        📝 My book was updated, so \`${options.agentName}\` may work differently from now on.

        I should re-check my plans towards my goal against the new book.
    `);
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
