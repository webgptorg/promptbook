import type { UserChatTimeoutRecord } from './UserChatTimeoutRecord';
import { updateAgentScopedUserChatTimeout } from './userChatTimeoutStore';
import { notifyUserChatTimeoutScheduleChanged } from './userChatTimeoutWorker';

/**
 * Outcome of holding one planned message back, or letting it go again.
 *
 * `isApplied` is `false` when the planned message could not take the requested state — because it is
 * firing right now, because it is already over, or because there is no such planned message.
 *
 * @private internal utility of the Agents Server planned messages
 */
export type SetAgentScopedUserChatTimeoutPausedStateResult =
    | { readonly isApplied: true; readonly plannedMessage: UserChatTimeoutRecord }
    | { readonly isApplied: false; readonly plannedMessage: UserChatTimeoutRecord | null };

/**
 * Options for holding one planned message back, or letting it go again.
 *
 * @private internal utility of the Agents Server planned messages
 */
export type SetAgentScopedUserChatTimeoutPausedStateOptions = {
    /**
     * Owning user, or `undefined` to span every user of the agent.
     */
    readonly userId?: number;
    readonly agentPermanentId: string;
    readonly timeoutId: string;

    /**
     * Whether the planned message should be held back from waking its agent.
     */
    readonly isPaused: boolean;
};

/**
 * Holds one planned message back from waking its agent, or lets it go again.
 *
 * This is the one place pausing is written and the worker is told about it, so a single planned
 * message paused from the admin manager and a whole agent paused at once behave identically.
 *
 * @param options - Planned message and the state it should take.
 * @returns Whether the planned message took the requested state, with the stored planned message.
 *
 * @private internal utility of the Agents Server planned messages
 */
export async function setAgentScopedUserChatTimeoutPausedState(
    options: SetAgentScopedUserChatTimeoutPausedStateOptions,
): Promise<SetAgentScopedUserChatTimeoutPausedStateResult> {
    const updatedPlannedMessage = await updateAgentScopedUserChatTimeout({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        timeoutId: options.timeoutId,
        patch: {
            pausedAt: options.isPaused ? new Date().toISOString() : null,
        },
    });

    if (!updatedPlannedMessage || Boolean(updatedPlannedMessage.pausedAt) !== options.isPaused) {
        return { isApplied: false, plannedMessage: updatedPlannedMessage };
    }

    notifyUserChatTimeoutScheduleChanged(updatedPlannedMessage);

    return { isApplied: true, plannedMessage: updatedPlannedMessage };
}
