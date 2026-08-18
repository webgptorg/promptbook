import { loadAgentNamesByPermanentId, loadUsernamesByUserId } from '../adminEntityLookups';
import type { PlannedMessageManagerRecord } from '../plannedMessagesAdmin';
import { getUserChatTimeoutById } from '../userChatTimeout';
import { mapPlannedMessageManagerRecord } from './mapPlannedMessageManagerRecord';

/**
 * Loads one planned message in the shape the admin manager shows it in.
 *
 * @param timeoutId - Id of the planned message.
 * @returns Planned-message manager row, or `null` when there is no such planned message.
 *
 * @private internal admin utility of Agents Server
 */
export async function loadPlannedMessageManagerRecord(timeoutId: string): Promise<PlannedMessageManagerRecord | null> {
    const plannedMessage = await getUserChatTimeoutById(timeoutId);

    if (!plannedMessage) {
        return null;
    }

    const [usernamesById, agentNamesByPermanentId] = await Promise.all([
        loadUsernamesByUserId([plannedMessage.userId]),
        loadAgentNamesByPermanentId([plannedMessage.agentPermanentId]),
    ]);

    return mapPlannedMessageManagerRecord({
        plannedMessage,
        usernamesById,
        agentNamesByPermanentId,
        atDate: new Date(),
    });
}
