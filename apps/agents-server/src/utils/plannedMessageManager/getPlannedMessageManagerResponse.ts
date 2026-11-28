import { loadAgentNamesByPermanentId, loadUsernamesByUserId } from '../adminEntityLookups';
import type { PlannedMessageManagerListResponse } from '../plannedMessagesAdmin';
import { listAllUserChatTimeouts } from '../userChatTimeout';
import { ensureUserChatTimeoutWorkerBootstrapped } from '../userChatTimeout/ensureUserChatTimeoutWorkerBootstrapped';
import { mapPlannedMessageManagerRecord } from './mapPlannedMessageManagerRecord';

/**
 * Largest number of planned messages the manager loads at once.
 *
 * The whole set is sent to the browser so filtering, counting, and sorting all see the same rows;
 * this cap keeps that promise affordable on a server with a long planning history.
 *
 * @private constant of `getPlannedMessageManagerResponse`
 */
const MAX_PLANNED_MESSAGE_MANAGER_ITEMS = 1_000;

/**
 * Builds the admin planned-message manager payload from live durable timeout state.
 *
 * Every planned message of every agent and every user of this server is listed, whether it is still
 * ahead, firing right now, or already over.
 *
 * @returns Planned messages with the moment they were read.
 *
 * @private internal admin utility of Agents Server
 */
export async function getPlannedMessageManagerResponse(): Promise<PlannedMessageManagerListResponse> {
    ensureUserChatTimeoutWorkerBootstrapped();

    // Note: One row above the cap is loaded, purely to tell whether anything was left out
    const loadedPlannedMessages = await listAllUserChatTimeouts({ limit: MAX_PLANNED_MESSAGE_MANAGER_ITEMS + 1 });
    const hasMore = loadedPlannedMessages.length > MAX_PLANNED_MESSAGE_MANAGER_ITEMS;
    const plannedMessages = hasMore
        ? loadedPlannedMessages.slice(0, MAX_PLANNED_MESSAGE_MANAGER_ITEMS)
        : loadedPlannedMessages;

    const [usernamesById, agentNamesByPermanentId] = await Promise.all([
        loadUsernamesByUserId(plannedMessages.map((plannedMessage) => plannedMessage.userId)),
        loadAgentNamesByPermanentId(plannedMessages.map((plannedMessage) => plannedMessage.agentPermanentId)),
    ]);
    const generatedAtDate = new Date();

    return {
        items: plannedMessages.map((plannedMessage) =>
            mapPlannedMessageManagerRecord({
                plannedMessage,
                usernamesById,
                agentNamesByPermanentId,
                atDate: generatedAtDate,
            }),
        ),
        generatedAt: generatedAtDate.toISOString(),
        hasMore,
    };
}
