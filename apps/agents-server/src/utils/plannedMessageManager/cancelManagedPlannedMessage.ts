import { AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS } from '../agentGoalChat/agentGoalChatPlannedMessageActions';
import { getUserChatTimeoutById } from '../userChatTimeout';

/**
 * Outcome of cancelling one planned message from the admin manager.
 *
 * @private internal admin utility of Agents Server
 */
export type CancelManagedPlannedMessageResult = 'cancelled' | 'not_found';

/**
 * Cancels one planned message of any agent, so it never wakes that agent again.
 *
 * The cancelled planned message is kept and keeps being listed as cancelled, because the manager is
 * also the place where an administrator asks what a planned message did before it stopped.
 *
 * @param timeoutId - Id of the planned message being cancelled.
 * @returns Whether the planned message was cancelled.
 *
 * @private internal admin utility of Agents Server
 */
export async function cancelManagedPlannedMessage(timeoutId: string): Promise<CancelManagedPlannedMessageResult> {
    const existingPlannedMessage = await getUserChatTimeoutById(timeoutId);

    if (!existingPlannedMessage) {
        return 'not_found';
    }

    const cancelResult = await AGENT_GOAL_CHAT_PLANNED_MESSAGE_ACTIONS.cancel({
        agentPermanentId: existingPlannedMessage.agentPermanentId,
        timeoutId,
    });

    return cancelResult.status === 'cancelled' ? 'cancelled' : 'not_found';
}
