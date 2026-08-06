import { serializeError } from '@promptbook-local/utils';
import type { UserChatSummarySeed } from '../userChat/createUserChatSummary';
import { createUserChatSummarySeedFromChatRecord } from '../userChat/listUserChats';
import { ensureAgentGoalChat } from './ensureAgentGoalChat';
import { isAgentGoalChatId } from './agentGoalChatIdentity';

/**
 * Puts the singleton goal chat of one agent on top of the chat-history list.
 *
 * The goal chat is not owned by the viewer and is therefore not part of the normal chat listing
 * query, so it is resolved separately and pinned in front of every other chat.
 *
 * @param options - Loaded chat seeds together with the agent and the viewer's access decision.
 * @returns Chat seeds, with the goal chat first whenever the viewer may read it.
 */
export async function prependAgentGoalChatSummarySeed(options: {
    readonly chatSummarySeeds: ReadonlyArray<UserChatSummarySeed>;
    readonly agentPermanentId: string;
    readonly isAgentGoalChatVisible: boolean;
}): Promise<Array<UserChatSummarySeed>> {
    const otherChatSummarySeeds = options.chatSummarySeeds.filter(
        (chatSummarySeed) => !isAgentGoalChatId(chatSummarySeed.id),
    );

    if (!options.isAgentGoalChatVisible) {
        return otherChatSummarySeeds;
    }

    try {
        const goalChat = await ensureAgentGoalChat(options.agentPermanentId);
        return [createUserChatSummarySeedFromChatRecord(goalChat), ...otherChatSummarySeeds];
    } catch (error) {
        // Note: A missing goal chat must never break the chat list of the agent
        console.error('[agent-goal-chat]', 'list_seed_failed', {
            agentPermanentId: options.agentPermanentId,
            error: serializeError(error as Error),
        });
        return otherChatSummarySeeds;
    }
}
